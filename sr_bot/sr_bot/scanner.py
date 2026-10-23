"""전체 종목 스캔."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

import pandas as pd

from .config import Config
from .data import Ticker, validate
from .strategy import Plan, Prepared, evaluate, scan_events

MIN_DAILY_BARS = 260


@dataclass
class ScanResult:
    cfg: Config
    session: pd.Timestamp
    checked: int
    evaluable: int
    unverified: Counter
    plans: list[Plan]                   # 기준선 구조가 있는 모든 종목 (적격·부적격 포함)
    charts: dict = field(default_factory=dict)   # code -> 차트용 봉 데이터
    demo: bool = False
    events_today: list = field(default_factory=list)   # 엔진 A: (Ticker, 사건봉 Level)
    adjust_today: list = field(default_factory=list)   # 엔진 B: (Ticker, 조정봉 Level)
    crosses: list = field(default_factory=list)        # 엔진 C: (Ticker, 조정봉 Level, 종가) 관심종목 편입
    lines: list = field(default_factory=list)          # 기준선 DB 행 (PART 18-1)

    @property
    def eligible(self) -> list[Plan]:
        return [p for p in self.plans if p.eligible]

    @property
    def signals(self) -> list[Plan]:
        """매매 조건 충족 (적격 + 신호)."""
        return [p for p in self.eligible if p.signal]

    @property
    def watch(self) -> list[Plan]:
        """관찰 후보 (적격이지만 조건 미충족)."""
        return [p for p in self.eligible if not p.signal]

    @property
    def top(self) -> list[Plan]:
        return self.eligible[: self.cfg.top_n]


def scan(cfg: Config, tickers: list[Ticker], frames: dict[str, pd.DataFrame | None],
         session: pd.Timestamp, demo: bool = False) -> ScanResult:
    unverified: Counter = Counter()
    plans: list[Plan] = []
    charts = {}
    evaluable = 0
    events_today, adjust_today, crosses, lines = [], [], [], []
    for tk in tickers:
        df = frames.get(tk.code)
        if df is not None:
            df = df.loc[:session]
        chk = validate(df, session, MIN_DAILY_BARS)
        if not chk.ok:
            unverified[chk.reason.split(" (")[0]] += 1
            continue
        evaluable += 1
        prep = Prepared(df, cfg)
        if len(prep.sig) < cfg.p.vol_window + 10:
            unverified["이력 부족"] += 1
            evaluable -= 1
            continue
        t = len(prep.sig) - 1
        ev = scan_events(prep, t)
        if ev["event"] is not None:
            events_today.append((tk, ev["event"]))
        if ev["adjust"] is not None:
            adjust_today.append((tk, ev["adjust"]))
        for lv in ev["cross"]:
            crosses.append((tk, lv, float(prep.sig["close"].iloc[t])))
        lines += line_rows(prep, tk)
        plan = evaluate(prep, t, tk)
        if plan is not None:
            plans.append(plan)
            charts[tk.code] = prep.sig.iloc[-90:]
    plans.sort(key=Plan.sort_key)
    top_codes = {p.code for p in [x for x in plans if x.eligible][: cfg.detail_n]}
    charts = {k: v for k, v in charts.items() if k in top_codes}
    crosses.sort(key=lambda x: -x[1].vol_ratio)
    events_today.sort(key=lambda x: -x[1].vol_ratio)
    return ScanResult(cfg, session, len(tickers), evaluable, unverified, plans, charts, demo,
                      events_today, adjust_today, crosses, lines)


def line_rows(prep: Prepared, tk: Ticker) -> list[dict]:
    """기준선 DB (PART 18-1): 신호 시간봉의 사건봉·조정봉 쌍과 현재 상태.

    상태: 저항 관찰(현재 종가 < 조정봉 종가) / 돌파 이후 위(지지 전환 후보 이상) — 세부 눌림·지지 판정은 리포트 본문.
    """
    tf = prep.cfg.tf
    sig = prep.sig
    c = sig["close"].to_numpy(float)
    idx = sig.index
    ev = {lv.src: lv for lv in prep.bar_levels if lv.tf == tf and lv.kind == "event"}
    rows = []
    for lv in prep.bar_levels:
        if lv.tf != tf or lv.kind != "adjust" or lv.src not in ev:
            continue
        i0 = int(idx.searchsorted(lv.born, side="right"))
        seg = c[i0:]
        up = [idx[i0 + k] for k in range(1, len(seg)) if seg[k - 1] <= lv.price < seg[k]]
        dn = [idx[i0 + k] for k in range(1, len(seg)) if seg[k - 1] >= lv.price > seg[k]]
        rows.append({
            "code": tk.code, "name": tk.name, "sector": tk.sector, "tf": tf,
            "event_date": lv.src.date(), "adjust_date": lv.born.date(),
            "value_ratio": round(lv.vol_ratio, 2), "event_value": lv.note,
            "event_close": ev[lv.src].price, "adjust_close": lv.price, "last_close": c[-1],
            "state": "저항 관찰" if c[-1] < lv.price else "돌파 이후 위",
            "last_cross_up": up[-1].date() if up else None, "last_cross_down": dn[-1].date() if dn else None,
            "event_mega": lv.mega,
        })
    return rows
