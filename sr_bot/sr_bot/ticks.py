"""호가 단위 반올림. 계산으로 만든 가격(매수 구간 상단, 예상 손절가 등)은 반드시 주문 가능한 가격으로 바꾼다."""
from __future__ import annotations

import math

# 2023-01-25 이후 KRX 유가·코스닥 공통 호가 단위
_KR_TICKS = ((2_000, 1), (5_000, 5), (20_000, 10), (50_000, 50),
             (200_000, 100), (500_000, 500), (math.inf, 1_000))


def tick_size(price: float, market: str) -> float:
    if market == "kr":
        for upper, tick in _KR_TICKS:
            if price < upper:
                return tick
    return 0.01 if price >= 1 else 0.0001


def round_tick(price: float, market: str, mode: str = "nearest") -> float:
    """mode: 'down'(매수 지정가·손절 추정), 'up', 'nearest'."""
    if price is None or not math.isfinite(price) or price <= 0:
        return price
    def snap(p: float) -> float:
        t = tick_size(p, market)
        q = p / t
        if mode == "down":
            q = math.floor(q + 1e-9)
        elif mode == "up":
            q = math.ceil(q - 1e-9)
        else:
            q = round(q)
        return q * t

    out = snap(price)
    # 구간 경계를 넘어 호가 단위가 바뀌면 바뀐 단위로 한 번 더 맞춘다 (예: 49,990 → 50,000)
    if tick_size(out, market) != tick_size(price, market):
        out = snap(out)
    return round(out, 4)


def fmt_price(price: float, market: str) -> str:
    if price is None or not math.isfinite(price):
        return "-"
    if market == "kr":
        return f"{price:,.0f}"
    return f"${price:,.2f}"
