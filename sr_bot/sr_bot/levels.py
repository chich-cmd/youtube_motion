"""기준선(기능선) 탐지. 차트술사 이론 완전판 PART 3·5·6·7·8·9.

- 사건봉: 거래대금이 직전 20봉 평균의 3배 이상 + (국내 일봉) 300억 원 이상인 봉. 종가 = 보조 기준선 [확정]
- 조정봉: 사건봉 바로 다음 봉 (색·모양 무관). 종가 = 핵심 탐색 기준선 [확정]
- 박스: 봉의 고점~저점, 또는 여러 봉 횡보 구간을 캔들 하나로 압축 (상단·내부 종가선·하단)
    ① 사건봉 바로 다음 봉이 도지 ② 추세전환 직전 봉 ③ 거래량이 터진 봉 ④ 여러 봉 횡보 박스
- 도지: 상단·종가·하단 세 기능선 [확정]. 추세 강화 도지 종가도 선으로 쓴다.
- 갭 발생봉 종가 (PART 5-6, 9). 갭 유형 ①② 구분은 미확정이라 방향만 기록한다.
- 연봉 종가선: 최상위 격 (PART 6-2)
- 종가 클러스터, 격(지지·저항·전환 이력)

모든 선은 실제 봉의 가격(종가·고가·저가)을 그대로 쓴다. 평균값을 쓰지 않으므로 호가 단위에 항상 맞는다.
선마다 born(확정 시점)을 기록해 두고, 판정 시점보다 늦게 확정된 선은 쓰지 않는다(미래 참조 방지).
기준선은 시간이 지났다는 이유만으로 지우지 않는다 (PART 18-5).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import TFParams

TF_RANK = {"D": 1, "W": 2, "M": 3, "Y": 4}
# 같은 가격대에 여러 근거가 겹칠 때 대표 가격으로 쓸 우선순위
KIND_RANK = {"year_close": 7, "adjust": 6, "event": 5, "doji_close": 5, "gap_close": 4, "box_close": 3,
             "cluster": 3, "box_high": 2, "box_low": 2, "doji_low": 2, "doji_high": 2}
KIND_LABEL = {
    "event": "사건봉 종가(보조)",
    "adjust": "조정봉 종가(핵심)",
    "gap_close": "갭 발생봉 종가",
    "year_close": "연봉 종가",
    "box_high": "박스 고점",
    "box_close": "박스 종가",
    "box_low": "박스 저점",
    "doji_close": "도지 종가",
    "doji_high": "도지 상단",
    "doji_low": "도지 하단",
    "cluster": "종가 클러스터",
}
TF_LABEL = {"D": "일봉", "W": "주봉", "M": "월봉", "Y": "연봉"}
BOX_SRC_LABEL = {"doji": "사건봉 다음 봉 도지", "doji_any": "도지", "reversal": "추세전환 직전 봉",
                 "volume": "거래량 급증봉", "range": "횡보 박스"}


@dataclass
class Box:
    """봉 하나의 고점~저점 박스."""

    low: float
    high: float
    close: float
    src: str                    # doji | reversal | volume
    tf: str
    born: pd.Timestamp          # 이 시점 종가 이후부터 사용 가능 (추세전환 봉은 전환 봉 확정 시점)
    date: pd.Timestamp          # 박스가 된 봉의 날짜
    mega: bool = False
    ratio: float = float("nan")  # 급증 배수 (거래대금 또는 거래량)
    end: pd.Timestamp | None = None  # 횡보 박스의 마지막 봉

    def describe(self) -> str:
        s = f"{TF_LABEL[self.tf]} {BOX_SRC_LABEL[self.src]} ({self.date:%Y-%m-%d}"
        if self.end is not None:
            s += f"~{self.end:%Y-%m-%d}"
        if np.isfinite(self.ratio) and self.src != "range":
            s += f", {'거래량' if self.src == 'volume' else '거래대금'} {self.ratio:.1f}배"
        return s + (") · 초고거래량" if self.mega else ")")


@dataclass
class Level:
    price: float
    kind: str
    tf: str
    born: pd.Timestamp          # 이 시점 종가 이후부터 사용 가능
    src: pd.Timestamp           # 근거 봉 날짜
    vol_ratio: float = float("nan")
    mega: bool = False          # 부록 A: 초고거래량 양봉 기반
    doji_type: str = ""         # after_surge | trend
    box: tuple | None = None    # 박스 (저점, 고점)
    box_src: str = ""
    note: str = ""              # 갭 방향, 사건봉 거래대금 등 표시용
    count: int = 0              # 클러스터 종가 수

    def describe(self) -> str:
        s = f"{TF_LABEL[self.tf]} {KIND_LABEL[self.kind]}"
        if self.kind == "cluster":
            s += f" ({self.count}회 체류)"
        elif self.box_src:
            s += f" · {BOX_SRC_LABEL[self.box_src]} ({self.src:%Y-%m-%d})"
        elif self.kind in ("event", "adjust") and np.isfinite(self.vol_ratio):
            s += f" (사건봉 {self.src:%Y-%m-%d}, 거래대금 {self.vol_ratio:.1f}배{', ' + self.note if self.note else ''})"
        elif self.note:
            s += f" ({self.src:%Y-%m-%d}, {self.note})"
        else:
            s += f" ({self.src:%Y-%m-%d})"
        if self.mega:
            s += " · 초고거래량"
        return s


@dataclass
class LevelGroup:
    price: float
    members: list[Level] = field(default_factory=list)

    @property
    def tfs(self) -> set[str]:
        return {m.tf for m in self.members}

    @property
    def top_tf(self) -> str:
        return max(self.tfs, key=TF_RANK.get)

    @property
    def mega(self) -> bool:
        return any(m.mega for m in self.members)

    @property
    def born(self) -> pd.Timestamp:
        return min(m.born for m in self.members)

    @property
    def box(self) -> tuple | None:
        boxes = [m.box for m in self.members if m.box]
        return boxes[0] if boxes else None

    def structural_bonus(self) -> float:
        b = (TF_RANK[self.top_tf] - 1) * 1.5 + (len(self.tfs) - 1) * 1.0
        if self.mega:
            b += 2.0
        if any(m.box_src for m in self.members):
            b += 1.0
        return b

    def describe(self) -> str:
        ms = sorted(self.members, key=lambda m: (-TF_RANK[m.tf], -KIND_RANK[m.kind]))
        seen, out = set(), []
        for m in ms:
            key = (m.tf, m.kind)
            if key not in seen:
                seen.add(key)
                out.append(m.describe())
        return " / ".join(out[:3])


def _prev_mean(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=max(3, n // 2)).mean().shift(1)


def _runs(flag: np.ndarray) -> np.ndarray:
    """flag가 연속으로 True인 길이 (해당 봉 포함)."""
    out = np.zeros(len(flag), dtype=int)
    run = 0
    for i, f in enumerate(flag):
        run = run + 1 if f else 0
        out[i] = run
    return out


def _fmt_value(v: float) -> str:
    return f"{v / 1e8:,.0f}억" if v >= 1e8 else f"{v:,.0f}"


def detect_bar_levels(df: pd.DataFrame, p: TFParams, tf: str, min_value: float = 0.0,
                      doji_any: bool = False) -> tuple[list[Level], list[Box]]:
    """사건봉·조정봉·갭·박스·도지 기준선. 각 선은 근거 봉 확정 시점(born)부터 유효하다.

    min_value: 사건봉 절대 거래대금 하한 (국내 일봉 300억 원). 0이면 상대 배수만 본다.
    """
    if tf == "Y":
        # 연봉: 확정된 연봉 종가 자체가 기준선
        return [Level(float(c), "year_close", "Y", d, d) for d, c in df["close"].items()], []
    if len(df) < p.vol_window + 2:
        return [], []
    idx = df.index
    o, h, l, c, v = (df[k].to_numpy(float) for k in ("open", "high", "low", "close", "volume"))
    rng = h - l
    body = np.abs(c - o)
    value = df["close"] * df["volume"]
    vr = (value / _prev_mean(value, p.vol_window)).to_numpy()
    qr = (df["volume"] / _prev_mean(df["volume"], p.vol_window)).to_numpy()
    ar = _prev_mean(pd.Series(rng, index=idx), p.vol_window).to_numpy()
    vmax_prev = value.rolling(p.mega_window, min_periods=1).max().shift(1).to_numpy()
    val = value.to_numpy(float)
    with np.errstate(invalid="ignore", divide="ignore"):
        body_ratio = np.where(rng > 0, body / rng, 1.0)
    is_doji = (body_ratio <= p.doji_body_ratio) & (rng > 0)
    n = len(df)

    out: list[Level] = []
    boxes: list[Box] = []
    mega_at = np.array([bool(i >= p.mega_min_bars and c[i] > o[i] and val[i] > np.nan_to_num(vmax_prev[i]))
                        for i in range(n)])
    # 직전 20봉이 온전할 때만 사건봉으로 인정한다 (신규 상장·거래정지 직후는 배수가 의미 없음 — 데이터 처리 규칙)
    full = (pd.Series(v, index=idx).rolling(p.vol_window, min_periods=p.vol_window).min().shift(1) > 0).to_numpy()
    event = full & np.isfinite(vr) & (np.nan_to_num(vr) >= p.high_vol_mult) & (val >= min_value)
    for i in np.flatnonzero(event):
        note = f"{_fmt_value(val[i])}" if min_value else ""
        mega = bool(mega_at[i])
        out.append(Level(c[i], "event", tf, idx[i], idx[i], float(vr[i]), mega, note=note))
        j = i + 1
        if j < n:
            # 조정봉: 사건봉 바로 다음 봉, 색·모양 무관. 종가가 핵심 탐색 기준선
            out.append(Level(c[j], "adjust", tf, idx[j], idx[i], float(vr[i]), mega, note=note))
            if is_doji[j]:  # 박스 ①
                boxes.append(Box(l[j], h[j], c[j], "doji", tf, idx[j], idx[j], mega, float(vr[i])))

    # 갭 발생봉 종가 (이전 봉 범위와 겹치지 않는 봉)
    for i in range(1, n):
        if l[i] > h[i - 1] or h[i] < l[i - 1]:
            out.append(Level(c[i], "gap_close", tf, idx[i], idx[i],
                             note="갭상승" if l[i] > h[i - 1] else "갭하락"))

    # 박스 ②: 추세전환 직전 봉. 종가 하락이 trend_run봉 이상 이어진 뒤 전환 봉이 직전 봉 고점 위에서 마감
    # (상승 추세 끝은 직전 봉 저점 아래 마감). 잔 흔들림을 거르려고 추세 구간 종가 이동폭이 평균 봉 길이의
    # 2배 이상일 때만 추세로 본다 (구현 설정값). 직전 봉이 박스, 전환 봉이 확정되는 시점부터 유효.
    dn = _runs(np.r_[False, c[1:] < c[:-1]])
    up = _runs(np.r_[False, c[1:] > c[:-1]])
    for j in range(2, n):
        k = j - 1
        run = max(dn[k], up[k])
        if run < p.trend_run or not np.isfinite(ar[k]) or abs(c[k] - c[k - run]) < 2 * ar[k]:
            continue
        if (dn[k] >= p.trend_run and c[j] > h[k]) or (up[k] >= p.trend_run and c[j] < l[k]):
            boxes.append(Box(l[k], h[k], c[k], "reversal", tf, idx[j], idx[k]))

    # 박스 ③: 거래량이 터진 봉
    for i in np.flatnonzero(full & np.isfinite(qr) & (np.nan_to_num(qr) >= p.high_vol_mult)):
        boxes.append(Box(l[i], h[i], c[i], "volume", tf, idx[i], idx[i], bool(mega_at[i]), float(qr[i])))

    # 도지 위치 제한 없이 (옵션)
    wide = rng >= np.nan_to_num(ar, nan=np.inf)
    if doji_any:
        for j in np.flatnonzero(is_doji & wide):
            boxes.append(Box(l[j], h[j], c[j], "doji_any", tf, idx[j], idx[j]))

    # 박스 ④: 여러 봉 횡보 박스
    boxes += detect_range_boxes(df, p, tf)

    uniq: dict = {}
    for bx in boxes:
        uniq.setdefault((bx.date, bx.end, bx.low, bx.high), bx)
    boxes = sorted(uniq.values(), key=lambda b: b.born)
    for bx in boxes:
        kinds = (("doji_close", bx.close), ("doji_high", bx.high), ("doji_low", bx.low)) \
            if bx.src.startswith("doji") else (("box_high", bx.high), ("box_close", bx.close), ("box_low", bx.low))
        for kind, price in kinds:
            out.append(Level(price, kind, tf, bx.born, bx.date, bx.ratio, bx.mega,
                             "after_surge" if bx.src == "doji" else "", (bx.low, bx.high), bx.src))

    # 추세 강화 도지 (공부법 Ⅱ-2): 몸통 큰 같은 방향 봉이 trend_run개 이상 이어진 뒤의 도지 종가. 선으로만 쓴다.
    strong = body_ratio >= p.long_body_ratio
    up_run = _runs((c > o) & strong)
    dn_run = _runs((c < o) & strong)
    box_days = {bx.date for bx in boxes if bx.src.startswith("doji")}
    for j in np.flatnonzero(is_doji & wide):
        if j == 0 or idx[j] in box_days:
            continue
        if up_run[j - 1] >= p.trend_run or dn_run[j - 1] >= p.trend_run:
            out.append(Level(c[j], "doji_close", tf, idx[j], idx[j], float(np.nan_to_num(vr[j])), False, "trend"))
    return out, boxes


def detect_range_boxes(df: pd.DataFrame, p: TFParams, tf: str) -> list[Box]:
    """여러 봉 횡보 박스 (PART 7). box_len봉 이상, 고저 폭 box_width 이하, 상·하단에서 각각 box_touch회 이상 반응.

    박스 강도(횡보 기간·누적 거래량·반복 반응)는 기간과 누적 거래량을 ratio·end에 남긴다.
    박스는 마지막 봉이 확정되는 시점(born)부터 유효하다. 길이·반응 수치는 미확정 — 구현 설정값.
    """
    n = len(df)
    L = p.box_len
    if n < L + 1:
        return []
    h, l, c, v = (df[k].to_numpy(float) for k in ("high", "low", "close", "volume"))
    idx = df.index
    out: list[Box] = []
    i = 0
    while i + L <= n:
        hi, lo = h[i:i + L].max(), l[i:i + L].min()
        if lo <= 0 or (hi - lo) / lo > p.box_width:
            i += 1
            continue
        e = i + L
        while e < n and max(hi, h[e]) / min(lo, l[e]) - 1 <= p.box_width:
            hi, lo = max(hi, h[e]), min(lo, l[e])
            e += 1
        band = 0.1 * (hi - lo)
        top = _dedupe_count(h[i:e] >= hi - band, 2)
        bot = _dedupe_count(l[i:e] <= lo + band, 2)
        if top >= p.box_touch and bot >= p.box_touch:
            closes = c[i:e]
            core = float(closes[np.argmin(np.abs(closes - np.median(closes)))])  # 내부 핵심 종가선 (실제 종가)
            out.append(Box(float(lo), float(hi), core, "range", tf, idx[e - 1], idx[i],
                           ratio=float(v[i:e].sum()), end=idx[e - 1]))
            i = e
        else:
            i += 1
    return out


def detect_clusters(df: pd.DataFrame, p: TFParams, tf: str, asof: int | None = None) -> list[Level]:
    """asof 시점까지 최근 cluster_window개 종가에서 밀집 구간을 찾는다."""
    end = len(df) if asof is None else asof + 1
    start = max(0, end - p.cluster_window)
    closes = df["close"].to_numpy(float)[start:end]
    if len(closes) < p.cluster_min * 2:
        return []
    vals = np.sort(closes)
    hi = np.searchsorted(vals, vals * (1 + p.cluster_tol), side="right")
    counts = hi - np.arange(len(vals))
    used = np.zeros(len(vals), dtype=bool)
    born = df.index[end - 1]
    out: list[Level] = []
    for i in np.argsort(-counts, kind="stable"):
        if counts[i] < p.cluster_min:
            break
        j = hi[i]
        if used[i:j].any():
            continue
        used[i:j] = True
        members = vals[i:j]
        rep = members[np.argmin(np.abs(members - np.median(members)))]
        out.append(Level(float(rep), "cluster", tf, born, born, count=int(j - i)))
    return out


def group_levels(levels: list[Level], tol: float) -> list[LevelGroup]:
    """가까운 가격의 선을 하나로 묶고, 대표 가격은 가장 높은 프레임·가장 강한 근거의 실제 가격으로 정한다."""
    if not levels:
        return []
    levels = sorted(levels, key=lambda x: x.price)
    groups: list[list[Level]] = [[levels[0]]]
    for lv in levels[1:]:
        anchor = groups[-1][0].price
        if lv.price <= anchor * (1 + tol):
            groups[-1].append(lv)
        else:
            groups.append([lv])
    out = []
    for g in groups:
        rep = max(g, key=lambda m: (TF_RANK[m.tf], m.mega, KIND_RANK[m.kind], -abs(m.price - np.median([x.price for x in g]))))
        out.append(LevelGroup(rep.price, g))
    return out


def level_events(df: pd.DataFrame, price: float, born: pd.Timestamp, end: int, p: TFParams) -> dict:
    """born 이후 ~ end 봉까지 기능 수행 이력 (격의 근거).

    hold   : 위에 있다가 선까지 내려와 종가로 지킴 (지지)
    reject : 아래에 있다가 선까지 올라와 종가로 막힘 (저항)
    flip   : 종가 기준으로 선을 통과 (기능 전환)
    """
    seg = df.iloc[: end + 1]
    seg = seg[seg.index > born]
    if len(seg) < 2:
        return {"hold": 0, "reject": 0, "flip": 0}
    c = seg["close"].to_numpy(float)
    h = seg["high"].to_numpy(float)
    l = seg["low"].to_numpy(float)
    pc = np.r_[np.nan, c[:-1]]
    tol = p.touch_tol
    ev = {
        "hold": (l <= price * (1 + tol)) & (c >= price) & (pc >= price),
        "reject": (h >= price * (1 - tol)) & (c < price) & (pc < price),
        "flip": ((pc < price) & (c >= price)) | ((pc >= price) & (c < price)),
    }
    return {k: _dedupe_count(m, p.event_dedupe) for k, m in ev.items()}


def _dedupe_count(mask: np.ndarray, gap: int) -> int:
    last, n = -10**9, 0
    for i in np.flatnonzero(mask):
        if i - last >= gap:
            n += 1
            last = i
    return n


def grade(group: LevelGroup, events: dict) -> float:
    """격 = 기능 수행 횟수 + 구조 가점(상위 프레임, 여러 프레임 겹침, 초고거래량, 장대봉 후 도지)."""
    return events["hold"] + events["reject"] + 1.5 * events["flip"] + group.structural_bonus()
