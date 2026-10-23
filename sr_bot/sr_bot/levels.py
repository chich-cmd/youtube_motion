"""지지저항 기능선 탐지 (공부법 Ⅱ장).

- 기준봉: 고거래량 봉의 종가
- 도지 전장: 고거래량 장대봉 이후 조정 도지 / 추세 강화 도지의 상단·하단·종가
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
KIND_RANK = {"doji_close": 5, "base": 4, "cluster": 3, "doji_low": 2, "doji_high": 2}
KIND_LABEL = {
    "base": "고거래량 기준봉 종가",
    "doji_close": "도지 종가",
    "doji_high": "도지 상단",
    "doji_low": "도지 하단",
    "cluster": "종가 클러스터",
}
TF_LABEL = {"D": "일봉", "W": "주봉", "M": "월봉"}


@dataclass
class Level:
    price: float
    kind: str
    tf: str
    born: pd.Timestamp          # 이 시점 종가 이후부터 사용 가능
    src: pd.Timestamp           # 근거 봉 날짜
    vol_ratio: float = float("nan")
    mega: bool = False          # 부록 A: 초고거래량 양봉 기반
    doji_type: str = ""         # after_long | trend
    box: tuple | None = None    # 도지 박스 (하단, 상단)
    count: int = 0              # 클러스터 종가 수

    def describe(self) -> str:
        s = f"{TF_LABEL[self.tf]} {KIND_LABEL[self.kind]}"
        if self.kind == "cluster":
            s += f" ({self.count}회 체류)"
        elif self.kind == "base" and np.isfinite(self.vol_ratio):
            s += f" ({self.src:%Y-%m-%d}, 거래량 {self.vol_ratio:.1f}배)"
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
        if any(m.doji_type == "after_long" for m in self.members):
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


def detect_bar_levels(df: pd.DataFrame, p: TFParams, tf: str) -> list[Level]:
    """기준봉·도지 박스. 각 선은 근거 봉 확정 시점(born)부터 유효하다."""
    if len(df) < p.vol_window + 2:
        return []
    idx = df.index
    o, h, l, c, v = (df[k].to_numpy(float) for k in ("open", "high", "low", "close", "volume"))
    rng = h - l
    body = np.abs(c - o)
    vr = (df["volume"] / _prev_mean(df["volume"], p.vol_window)).to_numpy()
    ar = _prev_mean(pd.Series(rng, index=idx), p.vol_window).to_numpy()
    vmax_prev = df["volume"].rolling(p.mega_window, min_periods=1).max().shift(1).to_numpy()
    with np.errstate(invalid="ignore", divide="ignore"):
        body_ratio = np.where(rng > 0, body / rng, 1.0)
    is_doji = (body_ratio <= p.doji_body_ratio) & (rng > 0)

    out: list[Level] = []
    doji_used: set[int] = set()
    n = len(df)
    for i in np.flatnonzero(np.nan_to_num(vr) >= p.high_vol_mult):
        mega = bool(i >= p.mega_min_bars and c[i] > o[i] and v[i] > np.nan_to_num(vmax_prev[i]))
        out.append(Level(c[i], "base", tf, idx[i], idx[i], float(vr[i]), mega))
        is_long = rng[i] >= p.long_range_mult * np.nan_to_num(ar[i], nan=np.inf) and body_ratio[i] >= p.long_body_ratio
        if not is_long:
            continue
        for j in range(i + 1, min(i + 1 + p.doji_lookahead, n)):
            if is_doji[j]:
                doji_used.add(j)
                box = (l[j], h[j])
                for kind, price in (("doji_close", c[j]), ("doji_high", h[j]), ("doji_low", l[j])):
                    out.append(Level(price, kind, tf, idx[j], idx[j], float(vr[i]), mega, "after_long", box))
                break

    # 추세 강화 도지: 몸통이 큰 같은 방향 봉이 trend_run개 이상 이어진 뒤, 평균 이상 길이의 도지
    strong = body_ratio >= p.long_body_ratio
    up_run = _runs((c > o) & strong)
    dn_run = _runs((c < o) & strong)
    wide = rng >= np.nan_to_num(ar, nan=np.inf)
    for j in np.flatnonzero(is_doji & wide):
        if j == 0 or j in doji_used:
            continue
        if up_run[j - 1] >= p.trend_run or dn_run[j - 1] >= p.trend_run:
            box = (l[j], h[j])
            out.append(Level(c[j], "doji_close", tf, idx[j], idx[j], float(np.nan_to_num(vr[j])), False, "trend", box))
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
