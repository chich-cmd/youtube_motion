"""전체 종목 스캔."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

import pandas as pd

from .config import Config
from .data import Ticker, validate
from .strategy import Plan, Prepared, evaluate

MIN_DAILY_BARS = 260


@dataclass
class ScanResult:
    cfg: Config
    session: pd.Timestamp
    checked: int
    evaluable: int
    unverified: Counter
    plans: list[Plan]                   # 기능선 구조가 있는 모든 종목 (적격·부적격 포함)
    charts: dict = field(default_factory=dict)   # code -> 차트용 봉 데이터
    demo: bool = False

    @property
    def eligible(self) -> list[Plan]:
        return [p for p in self.plans if p.eligible]

    @property
    def confirmed(self) -> list[Plan]:
        return [p for p in self.eligible if p.state == "confirmed"]

    @property
    def top(self) -> list[Plan]:
        return self.eligible[: self.cfg.top_n]


def scan(cfg: Config, tickers: list[Ticker], frames: dict[str, pd.DataFrame | None],
         session: pd.Timestamp, demo: bool = False) -> ScanResult:
    unverified: Counter = Counter()
    plans: list[Plan] = []
    charts = {}
    evaluable = 0
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
        plan = evaluate(prep, len(prep.sig) - 1, tk)
        if plan is not None:
            plans.append(plan)
            charts[tk.code] = prep.sig.iloc[-90:]
    plans.sort(key=Plan.sort_key)
    top_codes = {p.code for p in [x for x in plans if x.eligible][: cfg.detail_n]}
    charts = {k: v for k, v in charts.items() if k in top_codes}
    return ScanResult(cfg, session, len(tickers), evaluable, unverified, plans, charts, demo)
