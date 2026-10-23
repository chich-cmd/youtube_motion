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
    """일봉 → 주봉(W)/월봉(M)/연봉(Y). 각 봉의 날짜는 그 기간의 실제 마지막 거래일.

    마지막 봉이 아직 끝나지 않은 기간이면 제외한다(확정 봉만 사용).
    """
    if tf == "D":
        return daily
    rule = {"W": "W-FRI", "M": "ME", "Y": "YE"}[tf]
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
    if tf == "Y":
        year_end = last_bar_day + pd.offsets.BYearEnd(0)
        return last_bar_day >= year_end or asof > year_end
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

# KIND 업종(한국표준산업분류)을 리포트용 대분류로 묶는다. 위에서부터 먼저 맞는 것을 쓴다.
_SECTOR_RULES = (
    ("반도체·디스플레이", ("반도체", "전자부품", "디스플레이")),
    ("바이오·의료기기", ("의약", "의료", "생물", "바이오", "제약")),
    ("IT·소프트웨어", ("소프트웨어", "정보 서비스", "정보서비스", "컴퓨터 프로그래밍", "출판", "게임", "자료처리")),
    ("통신·전자장비", ("통신", "영상", "음향", "방송", "컴퓨터 및 주변장치")),
    ("자동차·부품", ("자동차", "트레일러")),
    ("조선·운송", ("선박", "운송", "항공", "해운", "창고")),
    ("전력·전기장비", ("전기", "전동기", "발전", "전지", "축전지", "가스", "증기", "절연선", "케이블", "조명")),
    ("기계·방산", ("기계", "장비", "금속 가공", "정밀기기", "무기")),
    ("화학·소재", ("화학", "플라스틱", "고무", "비금속", "펄프", "종이", "석유", "비료", "농약", "유리", "요업")),
    ("철강·금속", ("1차 금속", "철강", "금속")),
    ("금융·지주", ("금융", "은행", "보험", "증권", "지주", "신탁", "회사 본부")),
    ("건설·부동산", ("건설", "건물", "토목", "부동산", "시멘트", "건축", "공사업", "엔지니어링")),
    ("음식료·소비재", ("도매", "소매", "음식", "식료품", "식품", "음료", "사료", "도축", "곡물", "수산물", "유지",
                     "과실", "의복", "가구", "화장품", "생활용품", "가정용", "가죽", "신발", "직물", "방적", "섬유",
                     "상품 중개")),
    ("서비스·레저", ("영화", "오디오물", "창작", "예술", "스포츠", "광고", "여행", "숙박", "교육", "학원", "오락")),
    ("R&D·기술서비스", ("연구개발", "과학", "기술 서비스", "사업지원")),
)


def kr_sector(industry: str) -> str:
    industry = str(industry or "")
    for group, keys in _SECTOR_RULES:
        if any(k in industry for k in keys):
            return group
    return "기타·확인 필요"


def kr_universe(min_amount: float = 0) -> list[Ticker]:
    """KOSPI·KOSDAQ 상장 보통주 (KIND 상장법인 목록). 스팩·리츠 제외. 실패하면 FinanceDataReader."""
    import requests

    out: list[Ticker] = []
    try:
        for mt in ("stockMkt", "kosdaqMkt"):
            r = requests.get("https://kind.krx.co.kr/corpgeneral/corpList.do",
                             params={"method": "download", "searchType": 13, "marketType": mt},
                             headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
            r.encoding = "euc-kr"
            t = pd.read_html(io.StringIO(r.text))[0]
            for row in t.itertuples(index=False):
                name, code, industry = str(row.회사명), str(row.종목코드).zfill(6), row.업종
                if "스팩" in name or "리츠" in name or "기업인수목적" in str(industry):
                    continue
                out.append(Ticker(code, name, kr_sector(industry), "kr"))
    except Exception:
        out = []
    if out:
        return out

    import FinanceDataReader as fdr

    lst = fdr.StockListing("KRX")
    lst = lst[lst["Market"].isin(["KOSPI", "KOSDAQ", "KOSDAQ GLOBAL"])]
    lst = lst[~lst["Name"].str.contains("스팩|리츠|ETN", regex=True, na=False)]
    lst = lst[lst["Code"].str.endswith("0")]  # 우선주 제외
    if "Amount" in lst and min_amount:
        lst = lst[lst["Amount"].fillna(0) >= min_amount]
    return [Ticker(r.Code, r.Name, "기타·확인 필요", "kr") for r in lst.itertuples()]


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


_KO_COLS = {"날짜": "date", "일자": "date", "시가": "open", "고가": "high", "저가": "low",
            "종가": "close", "현재가": "close", "거래량": "volume"}


def load_dir(path: str | Path) -> tuple[list[Ticker], dict[str, pd.DataFrame]]:
    """폴더 안의 종목별 CSV(파일명 = 종목코드 또는 '코드_이름.csv')를 읽는다.

    열 이름은 date/open/high/low/close/volume 또는 날짜/시가/고가/저가/종가/거래량.
    같은 폴더에 universe.csv(code,name,sector)가 있으면 이름·업종을 가져온다.
    """
    path = Path(path)
    meta = {}
    if (path / "universe.csv").exists():
        u = pd.read_csv(path / "universe.csv", dtype={"code": str})
        meta = {r.code: r for r in u.itertuples()}
    tickers, frames = [], {}
    for f in sorted(path.glob("*.csv")):
        if f.name == "universe.csv":
            continue
        code, _, name = f.stem.partition("_")
        raw = pd.read_csv(f, thousands=",")
        raw = raw.rename(columns=lambda c: _KO_COLS.get(str(c).strip(), str(c).strip().lower()))
        date_col = "date" if "date" in raw.columns else raw.columns[0]
        df = normalize(raw.set_index(date_col))
        m = meta.get(code)
        tickers.append(Ticker(code, getattr(m, "name", None) or name or code,
                              getattr(m, "sector", None) or "기타·확인 필요"))
        frames[code] = df
    return tickers, frames


def median_turnover(daily: pd.DataFrame, n: int = 20) -> float:
    tv = (daily["close"] * daily["volume"]).iloc[-n:]
    return float(np.median(tv)) if len(tv) else 0.0
