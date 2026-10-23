"""시세 데이터 수집·검증·리샘플링.

- 한국: FinanceDataReader (네이버 일봉, 액면분할 반영). KRX 로그인 정보(KRX_ID/KRX_PW)가 있으면
  pykrx를 대신 쓸 수 있다.
- 미국: yfinance, auto_adjust=False → 분할만 반영되고 배당 수정은 하지 않은 종가.
  배당까지 수정한 가격은 과거 종가를 바꿔 기능선 위치를 틀어지게 하므로 쓰지 않는다.
"""
from __future__ import annotations

import io
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

COLS = ["open", "high", "low", "close", "volume"]
CACHE = Path(__file__).resolve().parent.parent / "data_cache"


@dataclass
class Ticker:
    code: str
    name: str
    sector: str = "기타·확인 필요"
    market: str = "kr"


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=str.lower)
    df = df[[c for c in COLS if c in df.columns]].copy()
    df.index = pd.DatetimeIndex(pd.to_datetime(df.index)).tz_localize(None).normalize()
    df = df[~df.index.duplicated(keep="last")].sort_index()
    df = df.dropna(subset=["open", "high", "low", "close"])
    df = df[(df["close"] > 0) & (df["high"] >= df["low"])]
    df["volume"] = df["volume"].fillna(0)
    return df.astype(float)


# ---------------------------------------------------------------- 리샘플링

def resample(daily: pd.DataFrame, tf: str, asof: pd.Timestamp | None = None) -> pd.DataFrame:
    """일봉 → 주봉(W)/월봉(M). 각 봉의 날짜는 그 기간의 실제 마지막 거래일.

    마지막 봉이 아직 끝나지 않은 기간이면 제외한다(확정 봉만 사용).
    """
    if tf == "D":
        return daily
    rule = {"W": "W-FRI", "M": "ME"}[tf]
    g = daily.groupby(pd.Grouper(freq=rule))
    out = g.agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
    last_day = g.apply(lambda x: x.index.max() if len(x) else pd.NaT)
    out.index = pd.DatetimeIndex(last_day.values)
    out = out[out.index.notna()].dropna()
    if len(out) and not _period_complete(out.index[-1], tf, asof or daily.index[-1]):
        out = out.iloc[:-1]
    return out


def _period_complete(last_bar_day: pd.Timestamp, tf: str, asof: pd.Timestamp) -> bool:
    if tf == "W":
        week_end = last_bar_day + pd.offsets.Week(weekday=4) if last_bar_day.weekday() != 4 else last_bar_day
        return last_bar_day.weekday() == 4 or asof > week_end
    month_end = last_bar_day + pd.offsets.BMonthEnd(0)
    return last_bar_day >= month_end or asof > month_end


# ---------------------------------------------------------------- 검증

@dataclass
class Check:
    ok: bool
    reason: str = ""


def expected_session(market_tz: str, close_hour: int, now: datetime | None = None) -> pd.Timestamp:
    """지금 기준으로 이미 마감된 가장 최근 평일 (휴장일은 모른다 → 종목들 최빈 날짜로 보정)."""
    now = now or datetime.now(ZoneInfo(market_tz))
    d = pd.Timestamp(now.date())
    if now.hour < close_hour:
        d -= pd.Timedelta(days=1)
    while d.weekday() >= 5:
        d -= pd.Timedelta(days=1)
    return d


def validate(df: pd.DataFrame | None, session: pd.Timestamp, min_bars: int) -> Check:
    if df is None or df.empty:
        return Check(False, "데이터 없음")
    if df.index[-1] < session:
        return Check(False, f"최신 봉 지연 ({df.index[-1]:%Y-%m-%d})")
    if len(df) < min_bars:
        return Check(False, f"이력 부족 ({len(df)}봉)")
    last = df.iloc[-1]
    if last["volume"] <= 0 or last["high"] == last["low"] == last["open"]:
        return Check(False, "거래정지·무거래 의심")
    jump = (df["close"].pct_change().abs() > 0.65).iloc[-60:]
    if jump.any():
        return Check(False, "가격 불연속 의심 (분할·병합 미반영 가능)")
    return Check(True)


def reference_session(frames: dict[str, pd.DataFrame], fallback: pd.Timestamp) -> pd.Timestamp:
    """종목들의 마지막 날짜 최빈값. 휴장일을 몰라도 '대부분 종목이 가진 마지막 거래일'을 기준일로 쓴다."""
    lasts = pd.Series([f.index[-1] for f in frames.values() if f is not None and len(f)])
    if lasts.empty:
        return fallback
    return min(lasts.mode().max(), fallback)


# ---------------------------------------------------------------- 캐시

def _cache_path(market: str, code: str) -> Path:
    return CACHE / market / f"{code}.csv"


def _read_cache(market: str, code: str, max_age_h: float) -> pd.DataFrame | None:
    p = _cache_path(market, code)
    if p.exists() and (time.time() - p.stat().st_mtime) < max_age_h * 3600:
        return pd.read_csv(p, index_col=0, parse_dates=True)
    return None


def _write_cache(market: str, code: str, df: pd.DataFrame) -> None:
    p = _cache_path(market, code)
    p.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(p)


# ---------------------------------------------------------------- 한국

def kr_universe(min_amount: float = 0) -> list[Ticker]:
    import FinanceDataReader as fdr

    lst = fdr.StockListing("KRX")
    lst = lst[lst["Market"].isin(["KOSPI", "KOSDAQ", "KOSDAQ GLOBAL"])]
    lst = lst[~lst["Name"].str.contains("스팩|리츠|ETN", regex=True, na=False)]
    lst = lst[lst["Code"].str.endswith("0")]  # 우선주 제외
    if "Amount" in lst and min_amount:
        lst = lst[lst["Amount"].fillna(0) >= min_amount]
    sectors: dict[str, str] = {}
    try:
        desc = fdr.StockListing("KRX-DESC")
        sectors = dict(zip(desc["Code"], desc["Sector"].fillna("기타·확인 필요")))
    except Exception:  # 업종 자료가 없어도 스캔은 진행
        pass
    return [Ticker(r.Code, r.Name, sectors.get(r.Code, "기타·확인 필요"), "kr") for r in lst.itertuples()]


def kr_fetch(code: str, start: str) -> pd.DataFrame | None:
    import os

    if os.getenv("KRX_ID") and os.getenv("KRX_PW"):
        from pykrx import stock

        df = stock.get_market_ohlcv(start.replace("-", ""), datetime.now().strftime("%Y%m%d"), code)
        df = df.rename(columns={"시가": "open", "고가": "high", "저가": "low", "종가": "close", "거래량": "volume"})
    else:
        import FinanceDataReader as fdr

        df = fdr.DataReader(code, start)
    return normalize(df) if df is not None and len(df) else None


# ---------------------------------------------------------------- 미국

def us_universe(name: str = "sp500") -> list[Ticker]:
    """S&P 500 / Nasdaq-100 구성 종목 (위키백과). 실패하면 universe/us_default.csv."""
    import requests

    urls = {
        "sp500": ("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", "Symbol", "Security", "GICS Sector"),
        "ndx": ("https://en.wikipedia.org/wiki/Nasdaq-100", "Ticker", "Company", "GICS Sector"),
    }
    out: dict[str, Ticker] = {}
    for key in (["sp500", "ndx"] if name == "all" else [name]):
        url, sym, nm, sec = urls[key]
        try:
            html = requests.get(url, headers={"User-Agent": "Mozilla/5.0 sr-bot"}, timeout=20).text
            for t in pd.read_html(io.StringIO(html)):
                if sym in t.columns and nm in t.columns:
                    for r in t.itertuples(index=False):
                        row = dict(zip(t.columns, r))
                        code = str(row[sym]).replace(".", "-").strip()
                        out[code] = Ticker(code, str(row[nm]), str(row.get(sec, "기타·확인 필요")), "us")
                    break
        except Exception:
            continue
    if not out:
        f = Path(__file__).resolve().parent.parent / "universe" / "us_default.csv"
        t = pd.read_csv(f)
        out = {r.code: Ticker(r.code, r.name, r.sector, "us") for r in t.itertuples()}
    return list(out.values())


def us_fetch_batch(codes: list[str], start: str) -> dict[str, pd.DataFrame]:
    import yfinance as yf

    raw = yf.download(codes, start=start, auto_adjust=False, group_by="ticker",
                      threads=True, progress=False)
    out = {}
    for c in codes:
        try:
            df = raw[c] if len(codes) > 1 else raw
            df = normalize(df.dropna(how="all"))
            if len(df):
                out[c] = df
        except KeyError:
            continue
    return out


# ---------------------------------------------------------------- 공통 진입점

def load_universe(market: str, universe: str | None, prefilter: float = 0) -> list[Ticker]:
    if universe and Path(universe).exists():
        t = pd.read_csv(universe, dtype={"code": str})
        return [Ticker(r.code, getattr(r, "name", r.code), getattr(r, "sector", "기타·확인 필요"), market)
                for r in t.itertuples()]
    if universe and universe not in ("sp500", "ndx", "all", "krx"):
        # 쉼표로 구분한 종목코드 목록
        return [Ticker(c.strip(), c.strip(), "기타·확인 필요", market) for c in universe.split(",") if c.strip()]
    if market == "kr":
        return kr_universe(prefilter)
    return us_universe(universe or "sp500")


def fetch_all(tickers: list[Ticker], market: str, years: int, cache_hours: float = 10,
              workers: int = 8) -> dict[str, pd.DataFrame | None]:
    start = (pd.Timestamp.today() - pd.DateOffset(years=years)).strftime("%Y-%m-%d")
    out: dict[str, pd.DataFrame | None] = {}
    todo = []
    for t in tickers:
        cached = _read_cache(market, t.code, cache_hours)
        if cached is not None:
            out[t.code] = cached
        else:
            todo.append(t.code)
    if market == "us":
        for i in range(0, len(todo), 100):
            chunk = todo[i:i + 100]
            got = us_fetch_batch(chunk, start)
            for c in chunk:
                out[c] = got.get(c)
                if got.get(c) is not None:
                    _write_cache(market, c, got[c])
    else:
        def job(code):
            for attempt in range(3):
                try:
                    return code, kr_fetch(code, start)
                except Exception:
                    time.sleep(1.5 * (attempt + 1))
            return code, None

        with ThreadPoolExecutor(workers) as ex:
            for code, df in ex.map(job, todo):
                out[code] = df
                if df is not None:
                    _write_cache(market, code, df)
    return out


def median_turnover(daily: pd.DataFrame, n: int = 20) -> float:
    tv = (daily["close"] * daily["volume"]).iloc[-n:]
    return float(np.median(tv)) if len(tv) else 0.0
