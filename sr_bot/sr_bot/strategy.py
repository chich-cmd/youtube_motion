"""기준선과 현재가의 관계 판정, 매매 후보 유형 분류, 가격 계획.

차트술사 이론 완전판(2026-10-24)을 따른다.
- 기준선 상태 (PART 18-2): 저항 관찰 → 종가 돌파 → 지지 전환 후보 → 눌림 후보 → 지지 확인 → 무효화
  눌림 후보(기준선 부근 재접근)와 지지 확인(유지 + 반등)은 다르다. 매매 조건 충족은 지지 확인부터다.
- 지지 판정 (PART 4-3): 아래꼬리의 일시 침범은 허용, 몸통과 종가가 선 위에 있어야 한다.
- 종목 발견과 매수 신호는 다르다 (PART 2). 조건이 없으면 무포지션 (원칙 ⑦).

유형
- 눌림(주력, 10-1): 저항 종가 돌파 → 되돌림 → 기준선 위 몸통·종가 유지 → 반등 = 지지 확인
- 돌파(10-2): 종가 돌파 확인 후 진입은 별개 전략. 돌파 당일 = 돌파 유형, 아래에서 대기 = 저항 관찰
- 저점(10-3): 반복 지지 바닥 가격에서 선제 진입. 종가 이탈 시 무효
- 도지(8): 상단·종가·하단. 내부 — 종가~하단 매수 우위, 하단 종가 이탈 시 실패.
          외부 상단 돌파 롱 — 1차 매수 상단, 2차 매수 종가, 하단 종가 이탈이 최종 실패
- 박스(7): 상단·내부 종가선·하단. 상단 종가 돌파(1파) → 상단·종가선 눌림(2파) → 지지 후 재상승(3파).
          1파 추격보다 2파 눌림을 기다린다. 돌파 후 철회선(상단 재침범 / 종가선 / 하단)은 사용자 선택(`box_fail`).

이동평균 등 보조지표는 핵심 판정을 대체하지 않으므로 점수에 넣지 않고 참고 정보로만 표시한다 (PART 12).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import levels as L
from .config import Config
from .data import Ticker, median_turnover, resample
from .ticks import fmt_price, round_tick

SETUP_ORDER = {"눌림": 0, "도지": 1, "박스": 2, "저점": 3, "돌파": 4}
SETUP_BASE = {"눌림": 20, "도지": 18, "박스": 16, "저점": 16, "돌파": 12}


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
    relation: str              # 저항 관찰 | 종가 돌파 | 지지 전환 후보 | 눌림 후보 | 지지 확인 | 박스 내부
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
        self.boxes: list[L.Box] = []
        for tf in cfg.level_tfs:
            # 300억 원 조건은 국내 일봉 기준 [확정]. 주·월봉에도 같은 하한을 쓰는 것은 구현 설정값.
            min_value = cfg.m.event_min_value if tf != "Y" else 0.0
            lv, bx = L.detect_bar_levels(self.frames[tf], cfg.tf_params[tf], tf, min_value, cfg.doji_any)
            self.bar_levels += lv
            self.boxes += bx
        self.bar_levels.sort(key=lambda x: x.born)
        self.boxes.sort(key=lambda x: x.born)
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
    # 목표 저항은 근거가 있는 선만: 일봉 박스 선(고점·종가·저점)만으로 된 가격대는 건너뛴다.
    # 박스 선을 모두 목표로 쓰면 1차 목표가 지나치게 가까워진다.
    def strong(g: L.LevelGroup) -> bool:
        return g.top_tf != "D" or any(not m.kind.startswith("box_") for m in g.members)

    above = [x for x in ctx.groups if x.price >= entry * (1 + cfg.min_target_gap) and strong(x)]
    targets = [(x.price, x.describe()) for x in above[:2]]
    if len(targets) < 2:
        sw = float(ctx.h[max(0, ctx.t - p.swing_window): ctx.t + 1].max())
        if sw >= entry * (1 + cfg.min_target_gap) and all(abs(sw / x[0] - 1) > p.merge_tol for x in targets):
            targets.append((sw, f"최근 {p.swing_window}봉 고점"))
    return sorted(targets)


def _build(ctx: _Ctx, g: L.LevelGroup, setup: str, signal: bool, relation: str, status: str,
           fail_line: float, zone_raw: tuple, entry_raw: float, entry_rule: str, fail_rule: str,
           b: int | None, pre_rejects: int, box: tuple | None = None,
           buys: list[tuple[float, float]] | None = None, key_line: float | None = None) -> Plan | None:
    prep, cfg, p, mkt = ctx.prep, ctx.prep.cfg, ctx.prep.cfg.p, ctx.prep.cfg.market
    t, sig = ctx.t, prep.sig
    # 기준선은 실제 봉 가격이지만 수정주가(증자·분할 반영)로 호가 단위와 어긋날 수 있어
    # 표시·주문 가격은 가장 가까운 호가로 맞춘다 (미국 주식은 부동소수 오차 제거)
    level_px = round_tick(g.price if key_line is None else key_line, mkt, "nearest")
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

    # 분할매수·분할익절 (PART 2-6). 기본은 구간 상단 → 기준선 부근 2분할, 박스는 고점·종가·저점 3분할.
    # 1차 목표에서 절반 익절 후 나머지는 본전 손절.
    split = {
        "buy": [(round_tick(px, mkt, "nearest"), w) for px, w in buys] if buys else [(zone[1], 0.5), (zone[0], 0.5)],
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


STRUCTURAL = {"event", "adjust", "gap_close", "year_close", "doji_close", "doji_high", "doji_low",
              "box_high", "box_close", "box_low"}


def _pre_rejects(ctx: _Ctx, P: float, lo: int, hi: int) -> int:
    p = ctx.prep.cfg.p
    pre = (ctx.h[lo:hi] >= P * (1 - p.touch_tol)) & (ctx.c[lo:hi] < P)
    return L._dedupe_count(pre, p.event_dedupe)


def _important(g: L.LevelGroup) -> bool:
    """사건봉·조정봉·도지·박스·갭·연봉처럼 거래 흔적에서 나온 선은 그 자체로 중요한 저항 후보다.
    종가 클러스터·추세 도지만으로 된 선은 저항 흔적이 있을 때만 쓴다."""
    return any(m.kind in STRUCTURAL and m.doji_type != "trend" for m in g.members)


def _held(ctx: _Ctx, k: int, line: float) -> bool:
    """몸통과 종가가 선 위 (아래꼬리 침범은 허용)."""
    return ctx.c[k] >= line and min(ctx.o[k], ctx.c[k]) >= line


def _retest(ctx: _Ctx, line: float, fail_px: float, b: int, top: float | None = None) -> tuple[str, int | None]:
    """돌파 봉 b 이후 되돌림 상태.

    눌림 후보 : 최근 봉 저가가 기준선(top) 부근까지 내려왔고 몸통·종가가 철회선 위
    지지 확인 : 눌림 후보 봉 이후 confirm_bars 안에 종가가 그 봉보다 높게 마감 (유지 + 반등), 몸통·종가가 철회선 위
    """
    p, t, l, c = ctx.prep.cfg.p, ctx.t, ctx.l, ctx.c
    top = line if top is None else top
    near = top * (1 + p.retest_zone)
    touches = [k for k in range(max(b + 1, t - p.confirm_bars), t + 1) if l[k] <= near and _held(ctx, k, fail_px)]
    if not touches:
        return "지지 전환 후보", None
    k = touches[-1] if touches[-1] < t else (touches[-2] if len(touches) > 1 else None)
    if k is not None and c[t] > c[k] and _held(ctx, t, fail_px) and ctx.close <= top * (1 + 2 * p.entry_buffer):
        return "지지 확인", k
    if touches[-1] == t:
        return "눌림 후보", t
    return "지지 전환 후보", None


def _struct_rule(ctx: _Ctx, g: L.LevelGroup, line: float) -> str:
    """상위 시간봉 선은 그 시간봉 종가로 구조를 판정하고, 포지션 위험은 판정 시간봉 종가로 따로 관리 (6-1, 14-3)."""
    sig_tf = ctx.prep.cfg.tf
    top = g.top_tf
    if L.TF_RANK[top] > L.TF_RANK[sig_tf]:
        fp = fmt_price(line, ctx.prep.cfg.market)
        return f" · 구조 붕괴 판정은 {L.TF_LABEL[top]} 종가 {fp} 이탈, 포지션 손절은 {L.TF_LABEL[sig_tf]} 종가 기준"
    return ""


def _pullback_or_breakout(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """기준선 위: 종가 돌파 당일, 지지 전환 후보, 눌림 후보, 지지 확인."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, P, t, c = ctx.prep.cfg.p, g.price, ctx.t, ctx.c
    born_i = ctx.born_index(g.born)
    below = np.flatnonzero(c[born_i: t + 1] < P)
    if not len(below):
        return None
    b = born_i + below[-1] + 1
    if b > t or (t - b > p.max_bars_since_break and not g.mega):
        return None
    pre = _pre_rejects(ctx, P, max(born_i, b - p.pre_window), b)
    if not _important(g) and pre < p.min_prior_rejects:
        return None
    fail_rule = f"종가가 기준선 {fp(P)} 아래로 마감하면 즉시 철회" + _struct_rule(ctx, g, P)
    if b == t:
        vr = ctx.value_ratio(b)
        sig_ok = np.isfinite(vr) and vr >= 1.5
        return _build(ctx, g, "돌파", bool(sig_ok), "종가 돌파",
                      "거래대금 동반 종가 돌파 (돌파매매: 종가 확인 후 진입)" if sig_ok
                      else "거래대금 부족한 종가 돌파 — 눌림까지 관찰",
                      P, (P, ctx.close), ctx.close,
                      "종가 돌파 확인 후 진입(장중 돌파 추격과 별개 전략) · 주력은 이후 눌림 대기",
                      fail_rule, b, pre)
    zone_hi = P * (1 + p.entry_buffer)
    state, _ = _retest(ctx, P, P, b)
    if state == "지지 확인":
        return _build(ctx, g, "눌림", True, state, "돌파 → 되돌림 → 기준선 위 몸통·종가 유지 → 반등",
                      P, (P, zone_hi), min(ctx.close, zone_hi),
                      "매수 검토 구간 안에서 분할매수", fail_rule, b, pre)
    status = ("기준선 부근 재접근 · 몸통·종가 유지 중 — 반등 확인 전" if state == "눌림 후보"
              else "돌파 후 기준선 위 · 되돌림 대기")
    return _build(ctx, g, "눌림", False, state, status, P, (P, zone_hi), zone_hi,
                  "기준선 부근에서 몸통·종가 유지 후 다음 봉 반등 시 진입 (2% 접근 자체는 지지 성공이 아님)",
                  fail_rule, b, pre)


def _bottom(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """반복적으로 바닥 기능을 한 기준선 재접근 (저점매매: 반등 확인 전 선제 진입)."""
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
    touched = l[t] <= P * (1 + p.retest_zone) and _held(ctx, t, P)
    fail_rule = f"판정선 {fp(P)} 아래 종가 마감 시 무효 (선제 진입이라 손절 기준이 특히 중요)" + _struct_rule(ctx, g, P)
    if touched:
        return _build(ctx, g, "저점", True, "지지 확인", f"바닥 기준선 {holds}회 지지 이력 · 이번 봉 몸통·종가 유지",
                      P, (P, zone_hi), min(ctx.close, zone_hi), "매수 검토 구간 안에서 분할매수",
                      fail_rule, None, 0)
    return _build(ctx, g, "저점", False, "지지 전환 후보", f"바닥 기준선 {holds}회 지지 이력 · 재접근 대기",
                  P, (P, zone_hi), zone_hi, "바닥 기준선까지 내려와 몸통·종가로 지지하면 진입", fail_rule, None, 0)


BOX_FAIL_LABEL = {"high": "상단 재침범", "close": "종가선 이탈", "low": "하단 이탈"}
BOX_PT_LABEL = {"high": "상단", "close": "종가선", "low": "하단"}


def _box_setup(ctx: _Ctx, bx: L.Box, g: L.LevelGroup) -> Plan | None:
    """도지·박스의 상단·종가·하단. 내부 시점과 상단 돌파 후(외부) 시점."""
    cfg, p, t, c = ctx.prep.cfg, ctx.prep.cfg.p, ctx.t, ctx.c
    fp = lambda x: fmt_price(x, cfg.market)  # noqa: E731
    lo, hi, cl = bx.low, bx.high, bx.close
    if hi <= lo:
        return None
    born_i = ctx.born_index(bx.born)
    if born_i > t + 1:
        return None
    doji = bx.src.startswith("doji")
    setup = "도지" if doji else "박스"
    name = "도지" if doji else "박스"
    src = L.BOX_SRC_LABEL[bx.src]
    since = c[born_i: t + 1]
    if (since < lo).any() and not (since > hi).any():
        return None  # 하단을 종가로 이탈한 도지·박스는 저항대 (숏 시나리오는 이 봇에서 다루지 않음)

    if not (since > hi).any():
        # 내부 시점: 종가~하단 = 매수 우위, 상단~종가 = 매도 우위 (8-1, 8-2)
        if (since < lo).any() or t - born_i > p.max_bars_since_break or not lo <= ctx.close <= hi:
            return None
        buy_side = ctx.close <= cl
        buys = [(cl, 0.5), (lo, 0.5)]
        return _build(ctx, g, setup, buy_side, "박스 내부",
                      f"{src} 안 · 종가~하단(매수 우위 구간)" if buy_side else f"{src} 안 · 상단~종가(매도 우위 구간) — 하단 쪽 대기",
                      lo, (lo, cl), min(ctx.close, cl),
                      f"{name} 종가~하단에서 분할매수", f"{name} 하단 {fp(lo)} 아래 종가 마감 시 실패",
                      None, 0, box=(lo, hi), buys=buys, key_line=lo)

    # 외부 시점: 상단 종가 돌파(1파) 이후 상단·종가선 눌림(2파)
    b = born_i + int(np.flatnonzero(since > hi)[0])
    key = "low" if doji and cfg.box_fail == "low" else cfg.box_fail
    fail_px = {"high": hi, "close": cl, "low": lo}[key]
    if b == t or (c[b: t + 1] < fail_px).any():
        return None  # 1파 당일(추격하지 않음)이거나 이미 철회선 이탈
    if t - b > p.max_bars_since_break and not bx.mega:
        return None
    if ctx.close > hi * (1 + p.max_dist):
        return None
    # 매수 지점: 철회선보다 위에 있는 상단·종가선 (철회선이 상단이면 상단 한 곳)
    pts = [(k, x) for k, x in (("high", hi), ("close", cl)) if x > fail_px + 1e-9 or (k == "high" and key == "high")]
    buys = [(x, 1 / len(pts)) for _, x in pts]
    avg = sum(px * w for px, w in buys)
    state, _ = _retest(ctx, hi, fail_px, b, top=hi)
    ok = state == "지지 확인"
    label = "→".join(f"{i + 1}차 {BOX_PT_LABEL[k]}" for i, (k, _) in enumerate(pts))
    status = {"지지 확인": f"{src} 상단 돌파 → 눌림 → 지지 후 반등 (3파 진입 구간)",
              "눌림 후보": f"{src} 상단 돌파 후 {name} 부근 눌림(2파) · 반등 확인 전",
              "지지 전환 후보": f"{src} 상단 돌파(1파) 후 위 · 2파 눌림 대기"}[state]
    return _build(ctx, g, setup, ok, state, status,
                  fail_px, (min(x for x, _ in buys), hi * (1 + p.entry_buffer)), min(avg, ctx.close) if ok else avg,
                  f"{label} 분할매수 (1파 추격 대신 2파 눌림 후 반등에서)",
                  f"{name} {BOX_FAIL_LABEL[key]}({fp(fail_px)}) 종가 마감 시 철회 — 설정 box_fail={cfg.box_fail}",
                  b, 0, box=(lo, hi), buys=buys, key_line=hi)


def _below_resistance(ctx: _Ctx, g: L.LevelGroup) -> Plan | None:
    """기준선 바로 아래 = 저항 관찰. 종가 돌파가 나오면 다음 단계로."""
    fp = lambda x: fmt_price(x, ctx.prep.cfg.market)  # noqa: E731
    p, P, t = ctx.prep.cfg.p, g.price, ctx.t
    if not (P * (1 - 3 * p.retest_zone) <= ctx.close < P):
        return None
    pre = _pre_rejects(ctx, P, max(ctx.born_index(g.born), t - p.pre_window), t + 1)
    if not _important(g) and pre < 2:
        return None
    entry = P * (1 + p.touch_tol)
    return _build(ctx, g, "돌파", False, "저항 관찰", f"기준선 아래 · 저항 {pre}회 · 종가 돌파 대기",
                  P, (P, entry), entry, "기준선 위 종가 마감(종가 돌파) 확인 후 눌림을 기다려 대응",
                  f"돌파 후 종가가 {fp(P)} 아래로 돌아오면 철회", None, pre)


def scan_events(prep: Prepared, t: int) -> dict:
    """탐색 엔진 A~C (PART 18-3, 확정 규칙). 신호 시간봉 기준.

    A: 이번 봉이 사건봉(거래대금 3배·국내 300억)인가
    B: 이번 봉이 사건봉 다음 봉(조정봉)인가 — 조정봉 종가 저장
    C: 이번 봉 종가가 과거 조정봉 종가를 아래에서 위로 돌파했는가 = 관심종목 편입 신호 (매수 신호 아님)
    """
    tf = prep.cfg.tf
    sig = prep.sig
    T = sig.index[t]
    c_now, c_prev = float(sig["close"].iloc[t]), float(sig["close"].iloc[t - 1]) if t > 0 else np.nan
    out = {"event": None, "adjust": None, "cross": []}
    for lv in prep.bar_levels:
        if lv.tf != tf or lv.born > T:
            continue
        if lv.kind == "event" and lv.born == T:
            out["event"] = lv
        elif lv.kind == "adjust":
            if lv.born == T:
                out["adjust"] = lv
            elif lv.born < T and c_prev <= lv.price < c_now:
                out["cross"].append(lv)
    return out


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
    # 박스: 박스 종가 기준선이 속한 묶음으로 격·근거를 계산한다
    group_of = {}
    for g in groups:
        for m in g.members:
            if m.box_src and m.kind in ("doji_close", "box_close"):
                group_of[(m.src, m.box_src, m.tf)] = g
    for bx in prep.boxes:
        if bx.born > T or bx.low < close * (1 - p.max_dist) * 0.9:
            continue
        g = group_of.get((bx.date, bx.src, bx.tf))
        if g is None:
            continue
        pl = _box_setup(ctx, bx, g)
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
