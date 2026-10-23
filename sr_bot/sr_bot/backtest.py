"""과거 데이터 검증.

각 봉 t에서 그 시점까지의 데이터만으로 판정하고(born ≤ t인 선만 사용), 매매 조건 충족(signal)이면
다음 봉 시가에 진입한다.
- 분할익절(기본): 고가가 1차 목표에 닿으면 절반 익절, 남은 절반은 손절선을 진입가로 올리고 2차 목표를 노린다
  (`split=False`면 1차 목표에서 전량 청산)
- 철회: 종가가 철회선(유형별 기준선·도지 하단) 아래로 마감하면 다음 봉 시가에 청산
- 시간 청산: max_hold 봉 경과 시 종가 청산
- 비용: 판정 시점의 유동성으로 계산한 왕복 비용을 차감
같은 종목은 포지션이 끝나기 전까지 새 신호를 받지 않는다.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

from .config import Config
from .data import Ticker
from .strategy import Prepared, evaluate


@dataclass
class Trade:
    code: str
    signal_date: pd.Timestamp
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    entry: float
    exit: float
    level: float
    stop: float
    t1: float
    setup: str
    outcome: str        # target | t1+t2 | t1+be | fail | time
    bars: int
    ret: float          # 비용 차감 수익률
    r: float            # 계획 위험(진입-손절 추정) 대비 배수
    score: float
    net_rr: float
    grade: float
    mega: bool
    tfs: str


def backtest_ticker(daily: pd.DataFrame, cfg: Config, tk: Ticker, warmup: int | None = None,
                    chase: float = 0.01, split: bool = True) -> list[Trade]:
    prep = Prepared(daily, cfg)
    sig = prep.sig
    p = cfg.p
    o, h, c = (sig[k].to_numpy(float) for k in ("open", "high", "close"))
    n = len(sig)
    warmup = warmup or max(p.vol_window + 10, min(p.cluster_window, n // 3))
    trades: list[Trade] = []
    t = warmup
    while t < n - 1:
        plan = evaluate(prep, t, tk, exact_clusters=False)
        if not (plan and plan.eligible and plan.signal):
            t += 1
            continue
        e = t + 1
        entry = o[e]
        if entry < plan.fail_line or entry > plan.zone[1] * (1 + chase):
            t += 1  # 갭으로 구간을 벗어나면 진입하지 않는다
            continue
        t2 = plan.t2 if split and plan.t2 else None
        fail = plan.fail_line
        half = None  # 1차 목표 절반 익절 가격
        exit_px, outcome, k = None, "", e
        for k in range(e, n):
            if half is None and h[k] >= plan.t1:
                px = max(o[k], plan.t1) if k > e else plan.t1
                if t2 is None:
                    exit_px, outcome = px, "target"
                    break
                half, fail = px, max(fail, entry)  # 남은 절반은 본전 손절
            if half is not None and t2 is not None and h[k] >= t2:
                exit_px, outcome = (half + max(o[k], t2)) / 2, "t1+t2"
                break
            if c[k] < fail:
                rest = o[k + 1] if k + 1 < n else c[k]
                k = min(k + 1, n - 1)
                exit_px, outcome = ((half + rest) / 2, "t1+be") if half is not None else (rest, "fail")
                break
            if k - e + 1 >= p.max_hold:
                exit_px, outcome = ((half + c[k]) / 2, "time") if half is not None else (c[k], "time")
                break
        if exit_px is None:
            break  # 데이터 끝까지 열린 포지션은 집계하지 않는다
        ret = exit_px / entry - 1 - plan.cost_pct
        risk = (entry - plan.stop) / entry + plan.cost_pct
        trades.append(Trade(tk.code, sig.index[t], sig.index[e], sig.index[k], entry, exit_px, plan.level,
                            plan.stop, plan.t1, plan.setup, outcome, k - e + 1, ret,
                            ret / risk if risk > 0 else np.nan, plan.score, plan.net_rr, plan.grade, plan.mega,
                            "+".join(plan.level_tfs)))
        t = k + 1
    return trades


def summarize(trades: list[Trade]) -> dict:
    if not trades:
        return {"trades": 0}
    df = pd.DataFrame([asdict(t) for t in trades])
    wins = df[df.ret > 0]
    loss = df[df.ret <= 0]
    pf = wins.ret.sum() / -loss.ret.sum() if len(loss) and loss.ret.sum() < 0 else np.inf
    out = {
        "trades": len(df),
        "win_rate": float((df.ret > 0).mean()),
        "target_rate": float(df.outcome.isin(["target", "t1+t2", "t1+be"]).mean()),
        "fail_rate": float((df.outcome == "fail").mean()),
        "avg_ret": float(df.ret.mean()),
        "median_ret": float(df.ret.median()),
        "avg_r": float(df.r.mean()),
        "profit_factor": float(pf),
        "avg_bars": float(df.bars.mean()),
    }
    df["bucket"] = pd.cut(df.score, [0, 50, 65, 80, 101], labels=["<50", "50-65", "65-80", "80+"], right=False)
    out["by_score"] = (df.groupby("bucket", observed=True)
                       .agg(trades=("ret", "size"), win_rate=("ret", lambda x: (x > 0).mean()),
                            avg_ret=("ret", "mean"), avg_r=("r", "mean"))
                       .round(4).reset_index().to_dict("records"))
    out["by_setup"] = (df.groupby("setup").agg(trades=("ret", "size"), win_rate=("ret", lambda x: (x > 0).mean()),
                                               avg_r=("r", "mean"))
                       .round(4).reset_index().to_dict("records"))
    out["by_tfs"] = (df.groupby("tfs").agg(trades=("ret", "size"), avg_r=("r", "mean"))
                     .round(4).reset_index().to_dict("records"))
    return out


def format_summary(s: dict) -> str:
    if not s.get("trades"):
        return "거래 없음 (매매 조건을 충족한 신호가 없었습니다)"
    lines = [
        f"거래 {s['trades']}건 · 승률 {s['win_rate']:.1%} · 1차 목표 도달 {s['target_rate']:.1%} · 철회(손절) {s['fail_rate']:.1%}",
        f"평균 수익률 {s['avg_ret']:+.2%} (중앙값 {s['median_ret']:+.2%}) · 평균 {s['avg_r']:+.2f}R · "
        f"손익비(PF) {s['profit_factor']:.2f} · 평균 보유 {s['avg_bars']:.1f}봉",
        "적합도 구간별:",
    ]
    for b in s["by_score"]:
        lines.append(f"  {b['bucket']:>6}: {b['trades']}건 · 승률 {b['win_rate']:.1%} · 평균 {b['avg_ret']:+.2%} · {b['avg_r']:+.2f}R")
    lines.append("유형별:")
    for b in s["by_setup"]:
        lines.append(f"  {b['setup']:>4}: {b['trades']}건 · 승률 {b['win_rate']:.1%} · {b['avg_r']:+.2f}R")
    lines.append("기준선 프레임별:")
    for b in s["by_tfs"]:
        lines.append(f"  {b['tfs']:>6}: {b['trades']}건 · {b['avg_r']:+.2f}R")
    return "\n".join(lines)
