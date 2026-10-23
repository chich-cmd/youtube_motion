"""테스트·데모용 가상 시세. 실제 시장 데이터가 아니다."""
from __future__ import annotations

import numpy as np
import pandas as pd


def _bars(closes, rng, vol_base=1e6, wick=0.006):
    closes = np.asarray(closes, float)
    opens = np.r_[closes[0], closes[:-1]] * (1 + rng.normal(0, 0.002, len(closes)))
    hi = np.maximum(opens, closes) * (1 + np.abs(rng.normal(0, wick, len(closes))))
    lo = np.minimum(opens, closes) * (1 - np.abs(rng.normal(0, wick, len(closes))))
    vol = vol_base * np.exp(rng.normal(0, 0.25, len(closes)))
    return opens, hi, lo, closes, vol


def random_walk(n=1500, start=100.0, seed=0, drift=0.0002, vol=0.018, end="2026-10-23"):
    rng = np.random.default_rng(seed)
    closes = start * np.exp(np.cumsum(rng.normal(drift, vol, n)))
    o, h, l, c, v = _bars(closes, rng, wick=vol / 3)
    idx = pd.bdate_range(end=end, periods=n)
    return pd.DataFrame({"open": o, "high": h, "low": l, "close": c, "volume": v}, index=idx)


def pullback_pattern(seed=1, end="2026-10-23", tail=0, R=100.0):
    """기능선 R: 고거래량 기준봉 종가 → 저항 3회 → 고거래량 장대 양봉 돌파 + 조정 도지 → R 재접근 지지.

    tail: 재접근 이후 덧붙일 봉 수 (0이면 마지막 봉이 지지 확인 봉).
    """
    rng = np.random.default_rng(seed)
    n0 = 320
    base = R * (0.9 + 0.02 * np.sin(np.linspace(0, 12, n0))) * np.exp(rng.normal(0, 0.004, n0))
    o, h, l, c, v = _bars(base, rng)
    # 기준봉 (bar 40): 종가가 정확히 R
    o[40], c[40], h[40], l[40], v[40] = R * 0.95, R, R * 1.004, R * 0.948, 4e6
    # 저항 테스트 (고가가 R 부근, 종가는 아래)
    for k in (150, 220, 290):
        o[k], c[k], h[k], l[k] = R * 0.965, R * 0.975, R * 1.002, R * 0.96
    rows = [list(x) for x in zip(o, h, l, c, v)]
    # 돌파: 장대 양봉 + 고거래량
    rows.append([R * 0.98, R * 1.105, R * 0.978, R * 1.10, 5e6])
    # 조정 도지
    rows.append([R * 1.10, R * 1.12, R * 1.085, R * 1.101, 2e6])
    # 상승 후 되돌림
    for x in (1.12, 1.15, 1.17, 1.14, 1.11, 1.08, 1.05, 1.03):
        rows.append([R * (x + 0.005), R * (x + 0.012), R * (x - 0.008), R * x, 0.8e6])
    # 재접근 지지 봉: 저가가 R 바로 위, 종가는 R 위에서 마감, 아래꼬리
    rows.append([R * 1.02, R * 1.024, R * 1.003, R * 1.016, 0.7e6])
    for i in range(tail):
        x = 1.02 + 0.01 * i
        rows.append([R * x, R * (x + 0.012), R * (x - 0.006), R * (x + 0.008), 1e6])
    arr = np.array(rows)
    idx = pd.bdate_range(end=end, periods=len(arr))
    return pd.DataFrame(arr, index=idx, columns=["open", "high", "low", "close", "volume"])
