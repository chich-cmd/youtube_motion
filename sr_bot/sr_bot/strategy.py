"""눌림매매(주력 구조) 판정과 가격 계획.

1. 저항 흔적: 돌파 전에 기능선에서 종가로 막힌 이력이 있다
2. 돌파: 종가가 기능선 위로 마감한 봉이 나왔다
3. 유지: 돌파 이후 종가가 한 번도 기능선 아래로 마감하지 않았다 (공통 실패 조건)
4. 재접근: 가격이 기능선 부근까지 내려와 종가로 지지했다 → '지지 확인'
   아직 내려오지 않았으면 '재접근 대기', 방금 돌파했으면 '돌파 직후'

이동평균 배열은 공부법에 없는 지표라 점수에 넣지 않고 참고 정보로만 표시한다.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import levels as L
from .config import Config
from .data import Ticker, median_turnover, resample
from .ticks import round_tick

STATE_LABEL = {"confirmed": "지지 확인", "waiting": "재접근 대기", "breakout": "돌파 직후"}
STATE_ORDER = {"confirmed": 0, "waiting": 1, "breakout": 2}


@dataclass
class Plan:
    code: str
    name: str
    sector: str
    tf: str
    asof: pd.Timestamp
    close: float
    level: float
    level_desc: str
    level_tfs: list
    mega: bool
    box: tuple | None
    state: str
    breakout_date: pd.Timestamp
    breakout_vr: float
    pullback_dry: bool | None
    events: dict
    pre_rejects: int
    grade: float
    zone: tuple
    entry: float
    stop: float
    stop_pct: float
    t1: float | None
    t2: float | None
    t1_desc: str
    cost_pct: float
    net_rr: float | None
    turnover: float
    score: float = 0.0
    score_parts: dict = field(default_factory=dict)
    qty: int | None = None
    warnings: list = field(default_factory=list)
    info: dict = field(default_factory=dict)
    eligible: bool = False
    reject: list = field(default_factory=list)

    @property
    def state_label(self) -> str:
        return STATE_LABEL[self.state]

    def sort_key(self):
        return (not self.eligible, STATE_ORDER[self.state], -self.score, -(self.net_rr or 0), self.code)


class Prepared:
    """한 종목의 프레임과 기능선을 미리 계산해 두고, 임의 시점(asof)에서 판정한다."""

    def __init__(self, daily: pd.DataFrame, cfg: Config):
        self.cfg = cfg
        self.daily = daily
        tfs = sorted(set(cfg.level_tfs) | {cfg.tf}, key=L.TF_RANK.get)
        self.frames = {tf: resample(daily, tf) for tf in tfs}
        self.sig = self.frames[cfg.tf]
        self.bar_levels: list[L.Level] = []
        for tf in cfg.level_tfs:
            self.bar_levels += L.detect_bar_levels(self.frames[tf], cfg.tf_params[tf], tf)
        self.bar_levels.sort(key=lambda x: x.born)
        self._born = np.array([lv.born for lv in self.bar_levels], dtype="datetime64[ns]")
        self._cluster_cache: dict = {}

    def levels_at(self, t: int, exact_clusters: bool = True) -> list[L.Level]:
        T = self.sig.index[t]
        k = np.searchsorted(self._born, np.datetime64(T), side="right")
        out = list(self.bar_levels[:k])
        for tf in self.cfg.level_tfs:
            fr = self.frames[tf]
            i = int(np.searchsorted(fr.index.values, np.datetime64(T), side="right")) - 1
            if i < 0:
                continue
            p = self.cfg.tf_params[tf]
            if not exact_clusters:
                i = (i // p.cluster_every) * p.cluster_every
            key = (tf, i)
            if key not in self._cluster_cache:
                self._cluster_cache[key] = L.detect_clusters(fr, p, tf, asof=i)
            out += self._cluster_cache[key]
        return out


def _cost(cfg: Config, turnover: float) -> float:
    c = cfg.m.base_cost
    for upper, slip in cfg.m.slippage_tiers:
        if turnover < upper:
            return c + slip
    return c


def _ma_state(daily: pd.DataFrame, T: pd.Timestamp) -> str:
    c = daily["close"].loc[:T]
    if len(c) < 120:
        return "자료 부족"
    m20, m60, m120 = (c.iloc[-n:].mean() for n in (20, 60, 120))
    if m20 > m60 > m120:
        return "정배열"
    if m20 < m60 < m120:
        return "역배열"
    return "혼조"


def _higher_low(weekly: pd.DataFrame, T: pd.Timestamp) -> bool | None:
    w = weekly.loc[:T]
    if len(w) < 8:
        return None
    return bool(w["low"].iloc[-4:].min() > w["low"].iloc[-8:-4].min())


def evaluate(prep: Prepared, t: int, tk: Ticker, exact_clusters: bool = True) -> Plan | None:
    cfg, p, mkt = prep.cfg, prep.cfg.p, prep.cfg.market
    sig = prep.sig
    if t < p.vol_window + 5:
        return None
    T = sig.index[t]
    o = sig["open"].to_numpy(float)[: t + 1]
    h = sig["high"].to_numpy(float)[: t + 1]
    l = sig["low"].to_numpy(float)[: t + 1]
    c = sig["close"].to_numpy(float)[: t + 1]
    v = sig["volume"].to_numpy(float)[: t + 1]
    close = c[t]
    groups = L.group_levels(prep.levels_at(t, exact_clusters), p.merge_tol)
    if not groups:
        return None
    daily_T = prep.daily.loc[:T]
    turnover = median_turnover(daily_T)
    cost = _cost(cfg, turnover)

    best: Plan | None = None
    for g in groups:
        P = g.price
        if not (close * (1 - p.max_dist) <= P <= close):
            continue
        born_i = int(np.searchsorted(sig.index.values, np.datetime64(g.born), side="right"))
        below = np.flatnonzero(c[born_i:] < P)
        if not len(below):
            continue  # 확정 이후 한 번도 선 아래에 있지 않았다 → 돌파한 저항선이 아님
        b = born_i + below[-1] + 1  # 마지막으로 아래 있던 봉 다음 = 돌파 봉
        if b > t:
            continue  # 현재 종가가 선 아래 = 무효
        if t - b > p.max_bars_since_break and not g.mega:
            continue
        # 돌파 전 저항 흔적 (기존 저항선이 존재하고 계속 뚫지 못한 흔적)
        pre_lo = max(born_i, b - p.pre_window)
        pre = (h[pre_lo:b] >= P * (1 - p.touch_tol)) & (c[pre_lo:b] < P)
        pre_rejects = L._dedupe_count(pre, p.event_dedupe)
        if pre_rejects < p.min_prior_rejects:
            continue

        zone_hi_raw = P * (1 + p.entry_buffer)
        touch_hi = P * (1 + p.retest_zone)
        recent = range(max(b + 1, t - p.confirm_bars + 1), t + 1)
        touched = any(l[k] <= touch_hi and c[k] >= P for k in recent)
        if b == t:
            state = "breakout"
        elif touched and close <= P * (1 + 2 * p.entry_buffer):
            state = "confirmed"
        else:
            state = "waiting"

        zone = (P, round_tick(zone_hi_raw, mkt, "down"))  # P는 실제 봉 가격이라 이미 호가 단위
        entry = round_tick(min(close, zone_hi_raw), mkt, "down") if state == "confirmed" else zone[1]
        stop = round_tick(P * (1 - p.fail_slip), mkt, "down")
        risk = entry - stop
        if risk <= 0:
            continue

        # 목표: 진입가 위의 다음 기능선들, 없으면 과거 고점
        above = [x for x in groups if x.price >= entry * (1 + cfg.min_target_gap)]
        targets = [(x.price, x.describe()) for x in above[:2]]
        if len(targets) < 2:
            sw = float(h[max(0, t - p.swing_window): t + 1].max())
            if sw >= entry * (1 + cfg.min_target_gap) and all(abs(sw / x[0] - 1) > p.merge_tol for x in targets):
                targets.append((sw, f"최근 {p.swing_window}봉 고점"))
        targets.sort()
        t1 = round_tick(targets[0][0], mkt, "down") if targets else None
        t2 = round_tick(targets[1][0], mkt, "down") if len(targets) > 1 else None
        net_rr = ((t1 - entry) - entry * cost) / (risk + entry * cost) if t1 else None

        ev = L.level_events(sig, P, g.born, t, p)
        gr = L.grade(g, ev)
        vol_avg = v[max(0, b - p.vol_window): b].mean() if b > 0 else np.nan
        bo_vr = float(v[b] / vol_avg) if vol_avg and vol_avg > 0 else float("nan")
        dry = bool(v[b + 1: t + 1].mean() < v[b] * 0.6) if t > b else None

        warnings = []
        if np.isfinite(bo_vr) and bo_vr < 1.0:
            warnings.append("거래량 없는 돌파 — 가짜 돌파(부록 B) 가능성")
        if t1 and (t1 / entry - 1) < 0.03:
            warnings.append("1차 저항까지 여유 3% 미만")
        if not targets:
            warnings.append("위쪽 기능선 없음(신고가 구간) — 목표 산정 불가")

        parts = {
            "격": min(gr / 8, 1) * 30,
            "프레임 겹침": min({1: 0, 2: 8}.get(len(g.tfs), 12) + (3 if g.mega else 0), 15),
            "상태": {"confirmed": 20, "waiting": 8, "breakout": 5}[state],
            "손익비": min(max(net_rr or 0, 0) / 3, 1) * 20,
            "거래량": (5 if np.isfinite(bo_vr) and bo_vr >= 1.5 else 0) + (5 if dry else 0),
        }
        penalty = 10 if warnings and warnings[0].startswith("거래량 없는") else 0
        score = float(np.clip((sum(parts.values()) - penalty) / 95 * 100, 0, 100))

        reject = []
        if turnover < cfg.m.min_turnover:
            reject.append("유동성 부족")
        if t1 is None:
            reject.append("목표 저항 없음")
        elif net_rr < cfg.min_net_rr:
            reject.append(f"순손익비 {net_rr:.2f} < {cfg.min_net_rr}")
        if risk / entry > cfg.max_stop_pct:
            reject.append(f"손절 폭 {risk / entry:.1%} > {cfg.max_stop_pct:.0%}")

        plan = Plan(
            code=tk.code, name=tk.name, sector=tk.sector, tf=cfg.tf, asof=T, close=close,
            level=P, level_desc=g.describe(), level_tfs=sorted(g.tfs, key=L.TF_RANK.get), mega=g.mega,
            box=g.box, state=state, breakout_date=sig.index[b], breakout_vr=bo_vr, pullback_dry=dry,
            events=ev, pre_rejects=pre_rejects, grade=gr, zone=zone, entry=entry, stop=stop,
            stop_pct=risk / entry, t1=t1, t2=t2, t1_desc=targets[0][1] if targets else "",
            cost_pct=cost, net_rr=net_rr, turnover=turnover, score=score, score_parts=parts,
            warnings=warnings, eligible=not reject, reject=reject,
        )
        if best is None or plan.sort_key() < best.sort_key():
            best = plan

    if best is not None:
        best.info = {"이평 배열(참고)": _ma_state(prep.daily, T)}
        if "W" in prep.frames:
            hl = _higher_low(prep.frames["W"], T)
            best.info["주봉 저점 상승(참고)"] = "예" if hl else "아니오" if hl is not None else "자료 부족"
        best.qty = position_size(cfg, best, prep.daily.loc[:T])
    return best


def position_size(cfg: Config, plan: Plan, daily: pd.DataFrame) -> int | None:
    """계좌 손실 한도(risk_per_trade) 안에서 살 수 있는 수량. 비중 상한·거래량 상한을 함께 적용."""
    if not cfg.account:
        return None
    per_share = plan.entry - plan.stop + plan.entry * plan.cost_pct
    qty = cfg.account * cfg.risk_per_trade / per_share
    qty = min(qty, cfg.account * cfg.max_position_pct / plan.entry)
    adv = daily["volume"].iloc[-20:].mean()
    if adv > 0:
        qty = min(qty, adv * cfg.max_adv_pct)
    return int(qty)
