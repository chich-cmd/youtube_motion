"""지지저항 기능선 탐지 (공부법 Ⅱ장).

- 기준봉: 거래대금 급증봉의 종가 (완전판 3-1: 거래량보다 거래대금으로 의미 있는 가격을 찾는다)
- 조정봉: 급증봉 직후 처음 나온 조정(음봉·눌림) 봉의 종가
- 박스: 봉의 고점~저점을 박스권으로 삼는다. 박스가 되는 봉은 세 가지
    ① 거래대금이 터진 바로 다음 봉의 도지 (가장 흔한 박스)
    ② 추세전환이 일어나기 직전 봉
    ③ 거래량이 터진 봉
- 도지 전장: 추세 강화 도지의 종가 (선으로만 사용)
- 종가 클러스터: 종가가 반복적으로 머문 가격대 (대표값은 실제 종가 하나)
- 격: 기능선이 지지·저항·전환을 수행한 횟수

모든 선은 실제 봉의 가격(종가·고가·저가)을 그대로 쓴다. 평균값을 쓰지 않으므로 호가 단위에 항상 맞는다.
선마다 born(확정 시점)을 기록해 두고, 판정 시점보다 늦게 확정된 선은 쓰지 않는다(미래 참조 방지).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import TFParams

TF_RANK = {"D": 1, "W": 2, "M": 3}
# 같은 가격대에 여러 근거가 겹칠 때 대표 가격으로 쓸 우선순위
KIND_RANK = {"doji_close": 5, "base": 4, "box_close": 3, "adjust": 3, "cluster": 3, "box_high": 2,
             "box_low": 2, "doji_low": 2, "doji_high": 2}
KIND_LABEL = {
    "base": "거래대금 급증봉 종가",
    "adjust": "급증 후 조정봉 종가",
    "box_high": "박스 고점",
    "box_close": "박스 종가",
    "box_low": "박스 저점",
    "doji_close": "도지 종가",
    "doji_high": "도지 상단",
    "doji_low": "도지 하단",
    "cluster": "종가 클러스터",
}
TF_LABEL = {"D": "일봉", "W": "주봉", "M": "월봉"}
BOX_SRC_LABEL = {"doji": "거래대금 급증 다음 봉 도지", "reversal": "추세전환 직전 봉", "volume": "거래량 급증봉"}


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

    def describe(self) -> str:
        s = f"{TF_LABEL[self.tf]} {BOX_SRC_LABEL[self.src]} ({self.date:%Y-%m-%d}"
        if np.isfinite(self.ratio):
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
    count: int = 0              # 클러스터 종가 수

    def describe(self) -> str:
        s = f"{TF_LABEL[self.tf]} {KIND_LABEL[self.kind]}"
        if self.kind == "cluster":
            s += f" ({self.count}회 체류)"
        elif self.box_src:
            s += f" · {BOX_SRC_LABEL[self.box_src]} ({self.src:%Y-%m-%d})"
        elif self.kind == "base" and np.isfinite(self.vol_ratio):
            s += f" ({self.src:%Y-%m-%d}, 거래대금 {self.vol_ratio:.1f}배)"
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


def detect_bar_levels(df: pd.DataFrame, p: TFParams, tf: str) -> tuple[list[Level], list[Box]]:
    """기준봉·조정봉·박스·추세 강화 도지. 각 선은 근거 봉 확정 시점(born)부터 유효하다.

    기준봉 급증은 거래대금(종가×거래량), 박스 ③은 거래량 기준이다.
    """
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
    surge = np.nan_to_num(vr) >= p.high_vol_mult
    mega_at = np.array([bool(i >= p.mega_min_bars and c[i] > o[i] and val[i] > np.nan_to_num(vmax_prev[i]))
                        for i in range(n)])
    for i in np.flatnonzero(surge):
        out.append(Level(c[i], "base", tf, idx[i], idx[i], float(vr[i]), bool(mega_at[i])))
        # 조정봉: 급증 양봉 이후 처음으로 종가가 내려온 봉
        if c[i] > o[i]:
            for j in range(i + 1, min(i + 1 + p.doji_lookahead, n)):
                if c[j] < c[j - 1] and not is_doji[j]:
                    out.append(Level(c[j], "adjust", tf, idx[j], idx[j], float(vr[i]), bool(mega_at[i])))
                    break
        # 박스 ①: 거래대금이 터진 바로 다음 봉이 도지
        j = i + 1
        if j < n and is_doji[j]:
            boxes.append(Box(l[j], h[j], c[j], "doji", tf, idx[j], idx[j], bool(mega_at[i]), float(vr[i])))

    # 박스 ②: 추세전환 직전 봉. 종가 하락이 trend_run봉 이상 이어진 뒤 전환 봉이 직전 봉 고점 위에서 마감
    # (상승 추세 끝은 직전 봉 저점 아래 마감). 직전 봉이 박스, 전환 봉이 확정되는 시점부터 유효.
    # 잔 흔들림을 거르기 위해 추세 구간의 종가 이동폭이 평균 봉 길이의 2배 이상일 때만 추세로 본다.
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
    for i in np.flatnonzero(np.nan_to_num(qr) >= p.high_vol_mult):
        boxes.append(Box(l[i], h[i], c[i], "volume", tf, idx[i], idx[i], bool(mega_at[i]), float(qr[i])))

    seen = set()
    for bx in boxes:
        key = (bx.date, bx.src)
        if key in seen:
            continue
        seen.add(key)
        kinds = (("doji_close", bx.close), ("doji_high", bx.high), ("doji_low", bx.low)) if bx.src == "doji" else \
                (("box_high", bx.high), ("box_close", bx.close), ("box_low", bx.low))
        for kind, price in kinds:
            out.append(Level(price, kind, tf, bx.born, bx.date, bx.ratio, bx.mega,
                             "after_surge" if bx.src == "doji" else "", (bx.low, bx.high), bx.src))

    # 추세 강화 도지 (공부법 Ⅱ-2): 몸통 큰 같은 방향 봉이 trend_run개 이상 이어진 뒤의 도지 종가. 선으로만 쓴다.
    strong = body_ratio >= p.long_body_ratio
    up_run = _runs((c > o) & strong)
    dn_run = _runs((c < o) & strong)
    wide = rng >= np.nan_to_num(ar, nan=np.inf)
    box_days = {bx.date for bx in boxes if bx.src == "doji"}
    for j in np.flatnonzero(is_doji & wide):
        if j == 0 or idx[j] in box_days:
            continue
        if up_run[j - 1] >= p.trend_run or dn_run[j - 1] >= p.trend_run:
            out.append(Level(c[j], "doji_close", tf, idx[j], idx[j], float(np.nan_to_num(vr[j])), False, "trend"))
    # 같은 봉에서 나온 박스(예: 거래량 급증봉이 추세전환 직전 봉이기도 함)는 하나만 남긴다
    uniq: dict = {}
    for bx in boxes:
        uniq.setdefault((bx.date, bx.low, bx.high), bx)
    return out, sorted(uniq.values(), key=lambda b: b.born)


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
