"""기준선과 현재가의 관계 판정, 매매 후보 유형 분류, 가격 계획.

차트술사 이론 완전판(2026-10-24) PART 2의 흐름을 따른다.
  3. 현재 가격과 기준선 관계 판정: 저항 아래 / 돌파 / 지지 / 이탈
  4. 매매 후보 유형 분류: 눌림 · 돌파 · 저점 · 도지 · 박스
  5. 매매 시나리오: 진입 조건 → 손절(철회) 조건 → 목표 구간

종목을 찾는 일과 매수 신호는 다르다(PART 2). 그래서 각 후보는 `signal`(매매 조건 충족)과
관찰 후보로 나뉜다. 조건이 충족되지 않으면 무포지션이 원칙이다(7대 원칙 ⑦).

유형별 정의
- 눌림(주력): 돌파 전 저항 흔적 → 종가 돌파 → 이후 종가 이탈 없음 → 기준선 재접근 후 종가 지지 = 신호
- 돌파: 저항 흔적이 있는 기준선을 거래대금 증가와 함께 종가 돌파한 봉 = 신호 / 바로 아래에서 대기 = 관찰.
  돌파와 돌파 이후 지지 성공은 다른 사건이므로(원칙 ⑤) 눌림과 따로 다룬다.
- 저점: 반복적으로 바닥(지지) 기능을 한 기준선까지 내려와 종가로 지킴 = 신호
- 도지: 급증 장대봉 뒤 도지 박스 내부, 종가~하단(매수 유리 구간)에 있음 = 신호. 하단 종가 이탈 시 실패
- 박스: 급증 장대봉의 고점~저점이 박스권.
    내부 시점 — 형성 후 종가가 박스를 벗어난 적 없고 현재가가 박스 아래 절반 = 신호, 하단 종가 이탈 시 철회
    외부 시점 — 박스 상단을 종가로 돌파한 뒤 상단까지 되돌림, 종가로 상단 위 유지 = 신호, 상단 종가 이탈 시 철회

이동평균 배열은 이론에 없는 지표라 점수에 넣지 않고 참고 정보로만 표시한다.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import levels as L
from .config import Config
from .data import Ticker, median_turnover, resample
from .ticks import fmt_price, round_tick

SETUP_ORDER = {"눌림": 0, "박스": 1, "저점": 2, "도지": 3, "돌파": 4}
SETUP_BASE = {"눌림": 20, "박스": 17, "저점": 16, "도지": 14, "돌파": 12}


@dataclass
class Plan:
    code: str
    name: str
    sector: str
    tf: str
    asof: pd.Timestamp
    close: float
    setup: str                 # 눌림 | 박스 | 저점 | 도지 | 돌파
    signal: bool               # 매매 조건 충족 여부 (False = 관찰 후보)
    relation: str              # 저항 아래 | 돌파 | 지지 | 이탈 직전 확인 등 현재가와 기준선 관계
    status: str                # 사람이 읽는 상태 설명
    level: float               # 핵심 기준선
    fail_line: float           # 이 가격 아래 종가 = 판단 철회
    level_desc: str
    level_tfs: list
    mega: bool
    box: tuple | None
    why: str                   # 왜 이 종목을 관찰하는가
    entry_rule: str
    fail_rule: str
    breakout_date: pd.Timestamp | None
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
    split: dict = field(default_factory=dict)
    warnings: list = field(default_factory=list)
    info: dict = field(default_factory=dict)
    eligible: bool = False
    reject: list = field(default_factory=list)

    @property
    def state_label(self) -> str:
        return f"{self.setup}·{'조건 충족' if self.signal else '관찰'}"

    def sort_key(self):
        return (not self.eligible, not self.signal, SETUP_ORDER[self.setup], -self.score,
                -(self.net_rr or 0), self.code)


class Prepared:
    """한 종목의 프레임과 기준선을 미리 계산해 두고, 임의 시점(asof)에서 판정한다."""

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


@dataclass
class _Ctx:
    """한 시점 판정에 공통으로 쓰는 배열과 값."""

    prep: Prepared
    t: int
    tk: Ticker
    o: np.ndarray
    h: np.ndarray
    l: np.ndarray
    c: np.ndarray
    v: np.ndarray
    val: np.ndarray
    groups: list
    turnover: float
    cost: float

    @property
    def close(self) -> float:
        return float(self.c[self.t])

    def value_ratio(self, i: int) -> float:
        n = self.prep.cfg.p.vol_window
        avg = self.val[max(0, i - n): i].mean() if i > 0 else np.nan
        return float(self.val[i] / avg) if avg and avg > 0 else float("nan")

    def born_index(self, born: pd.Timestamp) -> int:
        return int(np.searchsorted(self.prep.sig.index.values, np.datetime64(born), side="right"))


def _why(ctx: _Ctx) -> str:
    """왜 관찰하는가 (완전판 3-1: 거래대금이 발생한 종목)."""
    p = ctx.prep.cfg.p
    lo = max(p.vol_window, ctx.t - p.vol_window + 1)
    best_i, best_r = None, 0.0
    for i in range(lo, ctx.t + 1):
        r = ctx.value_ratio(i)
        if np.isfinite(r) and r > best_r:
            best_i, best_r = i, r
    if best_i is not None and best_r >= p.high_vol_mult:
        return f"최근 {p.vol_window}봉 내 거래대금 급증봉 {ctx.prep.sig.index[best_i]:%Y-%m-%d} (평균의 {best_r:.1f}배)"
    return "최근 거래대금 급증 없음 · 과거 기준선 재접근으로 관찰"


def _targets(ctx: _Ctx, entry: float) -> list[tuple[float, str]]:
    cfg, p = ctx.prep.cfg, ctx.prep.cfg.p
    above = [x for x in ctx.groups if x.price >= entry * (1 + cfg.min_target_gap)]
    targets = [(x.price, x.describe()) for x in above[:2]]
    if len(targets) < 2:
        sw = float(ctx.h[max(0, ctx.t - p.swing_window): ctx.t + 1].max())
        if sw >= entry * (1 + cfg.min_target_gap) and all(abs(sw / x[0] - 1) > p.merge_tol for x in targets):
            targets.append((sw, f"최근 {p.swing_window}봉 고점"))
    return sorted(targets)


def _build(ctx: _Ctx, g: L.LevelGroup, setup: str, signal: bool, relation: str, status: str,
           fail_line: float, zone_raw: tuple, entry_raw: float, entry_rule: str, fail_rule: str,
           b: int | None, pre_rejects: int, box: tuple | None = None) -> Plan | None:
    prep, cfg, p, mkt = ctx.prep, ctx.prep.cfg, ctx.prep.cfg.p, ctx.prep.cfg.market
    t, sig = ctx.t, prep.sig
    # 기준선은 실제 봉 가격이지만 수정주가(증자·분할 반영)로 호가 단위와 어긋날 수 있어
    # 표시·주문 가격은 가장 가까운 호가로 맞춘다 (미국 주식은 부동소수 오차 제거)
    level_px = round_tick(g.price, mkt, "nearest")
    fail_line = round_tick(fail_line, mkt, "nearest")
    zone = (round_tick(zone_raw[0], mkt, "nearest"), round_tick(zone_raw[1], mkt, "down"))
    entry = round_tick(entry_raw, mkt, "down")
    stop = round_tick(fail_line * (1 - p.fail_slip), mkt, "down")
    risk = entry - stop
    if risk <= 0:
        return None
    targets = _targets(ctx, entry)
    t1 = round_tick(targets[0][0], mkt, "down") if targets else None
    t2 = round_tick(targets[1][0], mkt, "down") if len(targets) > 1 else None
    net_rr = ((t1 - entry) - entry * ctx.cost) / (risk + entry * ctx.cost) if t1 else None

    ev = L.level_events(sig, g.price, g.born, t, p)
    gr = L.grade(g, ev)
    bo_vr = ctx.value_ratio(b) if b is not None else float("nan")
    dry = bool(ctx.val[b + 1: t + 1].mean() < ctx.val[b] * 0.6) if b is not None and t > b else None

    warnings = []
    if setup in ("눌림", "돌파") and np.isfinite(bo_vr) and bo_vr < 1.0:
        warnings.append("거래대금 없는 돌파 — 가짜 돌파(부록 B) 가능성")
    if t1 and (t1 / entry - 1) < 0.03:
        warnings.append("1차 목표까지 여유 3% 미만")
    if not targets:
        warnings.append("위쪽 기준선 없음(신고가 구간) — 목표 산정 불가")

    parts = {
        "격": min(gr / 8, 1) * 30,
        "프레임 겹침": min({1: 0, 2: 8}.get(len(g.tfs), 12) + (3 if g.mega else 0), 15),
        "유형·조건": SETUP_BASE[setup] if signal else SETUP_BASE[setup] * 0.4,
        "손익비": min(max(net_rr or 0, 0) / 3, 1) * 20,
        "거래대금": (5 if np.isfinite(bo_vr) and bo_vr >= 1.5 else 0) + (5 if dry else 0),
    }
    penalty = 10 if warnings and warnings[0].startswith("거래대금 없는") else 0
    score = float(np.clip((sum(parts.values()) - penalty) / 95 * 100, 0, 100))

    reject = []
    if ctx.turnover < cfg.m.min_turnover:
        reject.append("유동성 부족")
    if t1 is None:
        reject.append("목표 저항 없음")
    elif net_rr < cfg.min_net_rr:
        reject.append(f"순손익비 {net_rr:.2f} < {cfg.min_net_rr}")
    if risk / entry > cfg.max_stop_pct:
        reject.append(f"손절 폭 {risk / entry:.1%} > {cfg.max_stop_pct:.0%}")

    # 분할매수·분할익절 (PART 2-6). 1차는 구간 상단, 2차는 기준선 부근. 1차 목표에서 절반 익절 후 나머지는 본전 손절.
    split = {
        "buy": [(zone[1], 0.5), (zone[0], 0.5)],
        "sell": [(t1, 0.5), (t2 or t1, 0.5)] if t1 else [],
        "after_t1": "남은 물량 손절선을 평균 진입가로 올림",
    }

    return Plan(
        code=ctx.tk.code, name=ctx.tk.name, sector=ctx.tk.sector, tf=cfg.tf, asof=sig.index[t],
        close=ctx.close, setup=setup, signal=signal, relation=relation, status=status, level=level_px,
        fail_line=fail_line, level_desc=g.describe(), level_tfs=sorted(g.tfs, key=L.TF_RANK.get),
        mega=g.mega, box=box or g.box, why=_why(ctx), entry_rule=entry_rule, fail_rule=fail_rule,
        breakout_date=sig.index[b] if b is not None else None, breakout_vr=bo_vr, pullback_dry=dry,
        events=ev, pre_rejects=pre_rejects, grade=gr, zone=zone, entry=entry, stop=stop,
        stop_pct=risk / entry, t1=t1, t2=t2, t1_desc=targets[0][1] if targets else "",
        cost_pct=ctx.cost, net_rr=net_rr, turnover=ctx.turnover, score=score, score_parts=parts,
        split=split, warnings=warnings, eligible=not reject, reject=reject,
    )


def _pre_rejects(ctx: _Ctx, P: float, lo: int, hi: int) -> int:
    p = ctx.prep.cfg.p
    pre = (ctx.h[lo:hi] >= P * (1 - p.touch_tol)) & (ctx.c[lo:hi] < P)
    return L._dedupe_count(pre, p.event_dedupe)


def _pullback_or_breakout(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """기준선 위에 있는 경우: 눌림(돌파 후 재접근) 또는 돌파 당일."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, P, t, c, l = ctx.prep.cfg.p, g.price, ctx.t, ctx.c, ctx.l
    born_i = ctx.born_index(g.born)
    below = np.flatnonzero(c[born_i: t + 1] < P)
    if not len(below):
        return None
    b = born_i + below[-1] + 1
    if b > t or (t - b > p.max_bars_since_break and not g.mega):
        return None
    pre = _pre_rejects(ctx, P, max(born_i, b - p.pre_window), b)
    if pre < p.min_prior_rejects:
        return None
    fail_rule = f"종가가 기준선 {fp(P)} 아래로 마감하면 즉시 철회"
    if b == t:
        vr = ctx.value_ratio(b)
        sig_ok = np.isfinite(vr) and vr >= 1.5
        return _build(ctx, g, "돌파", bool(sig_ok), "돌파",
                      "거래대금 동반 종가 돌파" if sig_ok else "거래대금 부족한 종가 돌파 — 지지 확인까지 관찰",
                      P, (P, ctx.close), ctx.close,
                      "돌파 봉 종가 부근 진입, 분할매수 · 돌파 이후 지지 성공은 별도 확인(원칙 ⑤)",
                      fail_rule, b, pre)
    zone_hi = P * (1 + p.entry_buffer)
    touch_hi = P * (1 + p.retest_zone)
    recent = range(max(b + 1, t - p.confirm_bars + 1), t + 1)
    touched = any(l[k] <= touch_hi and c[k] >= P for k in recent)
    if touched and ctx.close <= P * (1 + 2 * p.entry_buffer):
        return _build(ctx, g, "눌림", True, "지지", "돌파 후 기준선 재접근 · 종가 지지 확인",
                      P, (P, zone_hi), min(ctx.close, zone_hi),
                      "매수 검토 구간 안에서 분할매수", fail_rule, b, pre)
    return _build(ctx, g, "눌림", False, "돌파 후 위", "돌파 후 기준선 위 · 재접근 대기",
                  P, (P, zone_hi), zone_hi,
                  f"기준선 +{p.retest_zone:.1%} 안까지 내려와 종가로 지지하면 진입", fail_rule, b, pre)


def _bottom(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """반복적으로 바닥 기능을 한 기준선 재접근 (저점)."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, P, t, c, l = ctx.prep.cfg.p, g.price, ctx.t, ctx.c, ctx.l
    born_i = ctx.born_index(g.born)
    lo = max(born_i, t - p.pre_window)
    if lo >= t or (c[lo: t + 1] < P).any():
        return None  # 구간 안에 종가 이탈이 있으면 바닥이 아니다
    held = (l[lo:t] <= P * (1 + p.retest_zone)) & (c[lo:t] >= P)
    holds = L._dedupe_count(held, p.event_dedupe * 2)
    if holds < 2:
        return None
    zone_hi = P * (1 + p.entry_buffer)
    touched = any(l[k] <= P * (1 + p.retest_zone) and c[k] >= P for k in range(max(lo, t - p.confirm_bars + 1), t + 1))
    fail_rule = f"판정선 {fp(P)} 아래 종가 마감 시 철회"
    if touched and ctx.close <= P * (1 + 2 * p.entry_buffer):
        return _build(ctx, g, "저점", True, "지지", f"바닥 기준선 {holds}회 지지 이력 · 이번 봉도 종가 지지",
                      P, (P, zone_hi), min(ctx.close, zone_hi), "매수 검토 구간 안에서 분할매수",
                      fail_rule, None, 0)
    return _build(ctx, g, "저점", False, "지지선 위", f"바닥 기준선 {holds}회 지지 이력 · 재접근 대기",
                  P, (P, zone_hi), zone_hi, "바닥 기준선까지 내려와 종가로 지지하면 진입", fail_rule, None, 0)


def _doji_inside(ctx: _Ctx, lv: L.Level, g: L.LevelGroup) -> Plan | None:
    """급증 장대봉 뒤 도지 박스 내부 (도지 내부 시점)."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, t, c = ctx.prep.cfg.p, ctx.t, ctx.c
    lo_box, hi_box = lv.box
    born_i = ctx.born_index(lv.born)
    if born_i > t + 1 or t - born_i > p.max_bars_since_break:  # 도지 봉 자체가 마지막 봉이어도 박스 내부
        return None
    if (c[born_i: t + 1] < lo_box).any() or (c[born_i: t + 1] > hi_box).any():
        return None  # 박스를 종가로 벗어났으면 내부 시점이 아니다
    fail_rule = f"도지 하단 {fp(lo_box)} 아래 종가 마감 시 철회"
    in_buy_half = lo_box <= ctx.close <= lv.price
    return _build(ctx, g, "도지", in_buy_half, "박스 내부",
                  "도지 종가~하단(매수 유리 구간)" if in_buy_half else "도지 상단~종가(매도 유리 구간) · 하단 쪽 대기",
                  lo_box, (lo_box, lv.price), min(ctx.close, lv.price),
                  "도지 하단부터 분할매수 (모멘텀·시황이 좋을 때)", fail_rule, None, 0, box=lv.box)


def _box(ctx: _Ctx, lv: L.Level, g: L.LevelGroup) -> Plan | None:
    """급증 장대봉의 고점~저점 박스. lv는 박스 상단(box_high) 기준선."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, t, c, l = ctx.prep.cfg.p, ctx.t, ctx.c, ctx.l
    lo_box, hi_box = lv.box
    if hi_box <= lo_box:
        return None
    born_i = ctx.born_index(lv.born)
    if born_i > t + 1:
        return None
    since = c[born_i: t + 1]
    mid = (lo_box + hi_box) / 2
    if not (since > hi_box).any():
        # 내부 시점: 형성 후 종가가 박스 안에만 있었다
        if (since < lo_box).any() or t - born_i > p.max_bars_since_break or not lo_box <= ctx.close <= hi_box:
            return None
        lower = ctx.close <= mid
        return _build(ctx, g, "박스", lower, "박스 내부",
                      "박스 아래 절반(매수 유리 구간)" if lower else "박스 위 절반 · 하단 쪽 대기",
                      lo_box, (lo_box, mid), min(ctx.close, mid),
                      "박스 하단~중간에서 분할매수", f"박스 하단 {fp(lo_box)} 아래 종가 마감 시 철회",
                      None, 0, box=lv.box)
    # 외부 시점: 상단 종가 돌파 이후
    b = born_i + int(np.flatnonzero(since > hi_box)[0])
    if (c[b: t + 1] < hi_box).any() or (t - b > p.max_bars_since_break and not lv.mega):
        return None  # 돌파 후 상단 아래로 종가가 내려왔으면 박스 위 구조가 깨진 것
    zone_hi = hi_box * (1 + p.entry_buffer)
    recent = range(max(b + 1, t - p.confirm_bars + 1), t + 1)
    touched = any(l[k] <= hi_box * (1 + p.retest_zone) and c[k] >= hi_box for k in recent)
    ok = touched and ctx.close <= hi_box * (1 + 2 * p.entry_buffer)
    return _build(ctx, g, "박스", ok, "박스 위" if not ok else "지지",
                  "박스 상단 돌파 후 되돌림 · 상단 종가 지지" if ok else "박스 상단 돌파 후 위 · 상단 재접근 대기",
                  hi_box, (hi_box, zone_hi), min(ctx.close, zone_hi) if ok else zone_hi,
                  "박스 상단 부근 분할매수" if ok else f"박스 상단 +{p.retest_zone:.1%} 안까지 내려와 종가로 지지하면 진입",
                  f"박스 상단 {fp(hi_box)} 아래 종가 마감 시 철회 (하단 {fp(lo_box)} 이탈은 구조 붕괴)",
                  b, 0, box=lv.box)


def _below_resistance(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """기준선 바로 아래, 저항 흔적이 반복된 경우 = 돌파 관찰 후보."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, P, t = ctx.prep.cfg.p, g.price, ctx.t
    if not (P * (1 - 3 * p.retest_zone) <= ctx.close < P):
        return None
    pre = _pre_rejects(ctx, P, max(ctx.born_index(g.born), t - p.pre_window), t + 1)
    if pre < 2:
        return None
    entry = P * (1 + p.touch_tol)
    return _build(ctx, g, "돌파", False, "저항 아래", f"저항 {pre}회 · 종가 돌파 대기",
                  P, (P, entry), entry, "거래대금 증가와 함께 기준선 위 종가 마감 시 진입",
                  f"돌파 후 종가가 {fp(P)} 아래로 돌아오면 철회", None, pre)


def evaluate_all(prep: Prepared, t: int, tk: Ticker, exact_clusters: bool = True) -> list[Plan]:
    cfg, p = prep.cfg, prep.cfg.p
    sig = prep.sig
    if t < p.vol_window + 5:
        return []
    T = sig.index[t]
    arr = {k: sig[k].to_numpy(float)[: t + 1] for k in ("open", "high", "low", "close", "volume")}
    levels = prep.levels_at(t, exact_clusters)
    groups = L.group_levels(levels, p.merge_tol)
    if not groups:
        return []
    turnover = median_turnover(prep.daily.loc[:T])
    ctx = _Ctx(prep, t, tk, arr["open"], arr["high"], arr["low"], arr["close"], arr["volume"],
               arr["close"] * arr["volume"], groups, turnover, _cost(cfg, turnover))
    close = ctx.close
    plans: list[Plan] = []
    for g in groups:
        if close * (1 - p.max_dist) <= g.price <= close:
            for fn in (_pullback_or_breakout, _bottom):
                pl = fn(ctx, g)
                if pl:
                    plans.append(pl)
                    break
        elif g.price > close:
            pl = _below_resistance(ctx, g)
            if pl:
                plans.append(pl)
    group_of = {id(m): g for g in groups for m in g.members}
    for lv in levels:
        if id(lv) not in group_of or not lv.box:
            continue
        pl = None
        if lv.kind == "doji_close" and lv.doji_type == "after_long":
            pl = _doji_inside(ctx, lv, group_of[id(lv)])
        elif lv.kind == "box_high" and lv.box[0] >= close * (1 - p.max_dist):
            pl = _box(ctx, lv, group_of[id(lv)])
        if pl:
            plans.append(pl)
    plans.sort(key=Plan.sort_key)
    return plans


def evaluate(prep: Prepared, t: int, tk: Ticker, exact_clusters: bool = True) -> Plan | None:
    """종목당 가장 우선순위가 높은 후보 하나."""
    plans = evaluate_all(prep, t, tk, exact_clusters)
    if not plans:
        return None
    best = plans[0]
    T = prep.sig.index[t]
    best.info = {"이평 배열(참고)": _ma_state(prep.daily, T)}
    if "W" in prep.frames:
        hl = _higher_low(prep.frames["W"], T)
        best.info["주봉 저점 상승(참고)"] = "예" if hl else "아니오" if hl is not None else "자료 부족"
    if len(plans) > 1:
        best.info["다른 후보"] = " / ".join(f"{x.setup}·{'충족' if x.signal else '관찰'} {fmt_price(x.level, prep.cfg.market)}"
                                         for x in plans[1:4])
    best.qty = position_size(prep.cfg, best, prep.daily.loc[:T])
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
