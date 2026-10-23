import pandas as pd
import pytest

from sr_bot import levels as L
from sr_bot.backtest import backtest_ticker, summarize
from sr_bot.config import load_config
from sr_bot.data import Ticker, resample, validate
import numpy as np

from sr_bot.strategy import Prepared, evaluate, evaluate_all
from sr_bot.synthetic import pullback_pattern, random_walk
from sr_bot.ticks import round_tick, tick_size

TK = Ticker("TEST", "테스트")


def _cfg(**kw):
    return load_config(market="us", tf="D", level_tfs=("D",), **kw)


def _pattern(**kw):
    df = pullback_pattern(**kw)
    df["volume"] *= 50  # 유동성 필터 통과
    return df


@pytest.mark.parametrize("price,tick", [(1_999, 1), (2_000, 5), (19_990, 10), (20_000, 50),
                                        (49_950, 50), (50_000, 100), (499_500, 500), (500_000, 1_000)])
def test_kr_tick_size(price, tick):
    assert tick_size(price, "kr") == tick


def test_round_tick():
    assert round_tick(35_122, "kr", "down") == 35_100
    assert round_tick(35_122, "kr", "up") == 35_150
    assert round_tick(3_434, "kr", "nearest") == 3_435
    assert round_tick(49_990, "kr", "up") == 50_000
    assert round_tick(235.384, "us", "down") == 235.38


def test_retest_alone_is_only_pullback_candidate():
    """기준선 부근 재접근만으로는 눌림 후보 (2% 접근 = 지지 성공이 아님, PART 19)."""
    plans = [p for p in _plans(_pattern()) if p.setup == "눌림" and p.level == pytest.approx(100.0)]
    assert plans and plans[0].relation == "눌림 후보" and not plans[0].signal


def test_pullback_confirmed_on_planted_level():
    df = _pattern(tail=1)  # 재접근 봉 다음 봉이 몸통·종가 유지하며 반등
    plan = evaluate(Prepared(df, _cfg()), len(df) - 1, TK)
    assert plan is not None
    assert plan.level == pytest.approx(100.0)
    assert plan.setup == "눌림" and plan.signal and plan.relation == "지지 확인"
    assert plan.eligible
    assert plan.zone[0] <= plan.entry <= plan.zone[1]
    assert plan.stop < plan.level < plan.entry < plan.t1
    assert plan.pre_rejects >= 1
    assert plan.net_rr >= 1.5


def test_close_below_level_invalidates():
    df = _pattern()
    df.iloc[-1, df.columns.get_loc("close")] = 99.0  # 종가가 기능선 아래로 마감
    df.iloc[-1, df.columns.get_loc("low")] = 98.5
    plans = evaluate_all(Prepared(df, _cfg()), len(df) - 1, TK)
    at100 = [p for p in plans if p.level == pytest.approx(100.0) and p.setup in ("눌림", "돌파")]
    # 눌림 신호는 사라지고, 남는다면 '저항 아래' 관찰 후보뿐이다
    assert all(not p.signal and p.relation == "저항 관찰" for p in at100)


def test_no_lookahead():
    """t 시점 판정은 t 이후 데이터가 있어도 같아야 한다."""
    full = _pattern(tail=15)
    t = len(full) - 15
    a = evaluate(Prepared(full, _cfg()), t, TK)
    b = evaluate(Prepared(full.iloc[: t + 1], _cfg()), t, TK)
    assert (a.level, a.setup, a.signal, a.entry, a.t1, a.stop) == (b.level, b.setup, b.signal, b.entry, b.t1, b.stop)


def test_levels_are_actual_prices():
    df = random_walk(800, seed=3)
    cfg = _cfg()
    prices = set(df["close"]) | set(df["high"]) | set(df["low"])
    bar_lv, boxes = L.detect_bar_levels(df, cfg.p, "D")
    lv = bar_lv + L.detect_clusters(df, cfg.p, "D")
    assert lv and all(x.price in prices for x in lv)
    assert all(b.low in prices and b.high in prices and b.close in prices for b in boxes)
    for g in L.group_levels(lv, cfg.p.merge_tol):
        assert g.price in prices


def test_weekly_resample_drops_incomplete_week():
    df = random_walk(300, end="2026-10-21")  # 수요일
    w = resample(df, "W")
    assert w.index[-1] < pd.Timestamp("2026-10-19")
    assert w.index[-1].weekday() == 4


def test_validate_stale():
    df = random_walk(300, end="2026-10-20")
    assert not validate(df, pd.Timestamp("2026-10-23"), 260).ok
    assert validate(df, pd.Timestamp("2026-10-20"), 260).ok


def test_backtest_runs_and_targets_hit():
    trades = backtest_ticker(_pattern(tail=15), _cfg(), TK, warmup=200)
    planted = [t for t in trades if t.level == pytest.approx(100.0)]
    assert planted and planted[0].outcome in ("target", "t1+t2", "t1+be")
    assert summarize(trades)["trades"] == len(trades)


def test_position_size_respects_risk():
    cfg = _cfg(account=10_000_000, risk_per_trade=0.01)
    df = _pattern(tail=1)
    plan = evaluate(Prepared(df, cfg), len(df) - 1, TK)
    loss = plan.qty * (plan.entry - plan.stop + plan.entry * plan.cost_pct)
    assert 0 < loss <= 10_000_000 * 0.01 + 1e-6


def _plans(df, t=None):
    prep = Prepared(df, _cfg())
    return evaluate_all(prep, len(prep.sig) - 1 if t is None else t, TK)


def test_breakout_day_is_breakout_setup():
    df = _pattern().iloc[:321]  # 마지막 봉 = 거래대금 급증 장대 양봉 돌파
    hits = [p for p in _plans(df) if p.setup == "돌파" and p.level == pytest.approx(100.0)]
    assert hits and hits[0].signal and hits[0].relation == "종가 돌파"


def test_doji_inside_box():
    df = _pattern().iloc[:322]  # 마지막 봉 = 돌파 직후 조정 도지
    hits = [p for p in _plans(df) if p.setup == "도지"]
    assert hits and hits[0].box is not None
    assert hits[0].fail_line == pytest.approx(hits[0].box[0])


def test_below_resistance_is_watch_only():
    df = _pattern().iloc[:320].copy()
    df.iloc[-1, df.columns.get_loc("close")] = 97.0  # 기준선 100 바로 아래
    df.iloc[-1, df.columns.get_loc("high")] = 97.5
    hits = [p for p in _plans(df) if p.setup == "돌파" and p.relation == "저항 관찰"]
    assert hits and not hits[0].signal


def test_bottom_support():
    rng = np.random.default_rng(7)
    n = 300
    c = 112 * np.exp(rng.normal(0, 0.004, n))
    o = c * (1 + rng.normal(0, 0.002, n))
    h = np.maximum(o, c) * 1.004
    lo = np.minimum(o, c) * 0.996
    v = np.full(n, 1e6) * 50
    o[30], c[30], h[30], lo[30], v[30] = 99.0, 100.0, 100.5, 98.8, 2e8  # 거래대금 급증봉 종가 100
    for k in (120, 190, 250, n - 1):
        o[k], c[k], h[k], lo[k] = 103.0, 102.0, 103.5, 100.3
    df = pd.DataFrame({"open": o, "high": h, "low": lo, "close": c, "volume": v},
                      index=pd.bdate_range(end="2026-10-23", periods=n))
    hits = [p for p in _plans(df) if p.setup == "저점" and p.level == pytest.approx(100.0)]
    assert hits and hits[0].signal


def _box_frame(last_close: float, retest: bool = False):
    """거래량 급증봉(저점 100, 종가 109.5, 고점 110) 뒤 박스 내부, 또는 상단 돌파 후 눌림 → 반등."""
    rng = np.random.default_rng(3)
    n = 200
    c = 95 * np.exp(rng.normal(0, 0.003, n))
    o = c * (1 + rng.normal(0, 0.001, n))
    h = np.maximum(o, c) * 1.003
    lo = np.minimum(o, c) * 0.997
    v = np.full(n, 5e7)
    o[150], h[150], lo[150], c[150], v[150] = 100.5, 110.0, 100.0, 109.5, 5e8
    for k in range(151, n):
        x = 104.0 if not retest else (113.0 if k < 190 else 112.0)
        o[k], c[k], h[k], lo[k] = x, x, x * 1.003, x * 0.997
    if retest:
        o[-2], h[-2], lo[-2], c[-2] = 111.5, 111.8, 110.3, 111.0   # 상단 부근 눌림, 몸통·종가 유지
        o[-1], h[-1], lo[-1], c[-1] = 111.2, last_close + 0.3, 111.0, last_close  # 반등
    else:
        o[-1], h[-1], lo[-1], c[-1] = 104.0, 104.5, 102.0, last_close
    return pd.DataFrame({"open": o, "high": h, "low": lo, "close": c, "volume": v},
                        index=pd.bdate_range(end="2026-10-23", periods=n))


def test_box_inside_buys_close_to_low():
    hits = [p for p in _plans(_box_frame(103.0)) if p.setup == "박스" and p.box == pytest.approx((100.0, 110.0))]
    assert hits and hits[0].signal and hits[0].relation == "박스 내부"
    assert hits[0].fail_line == pytest.approx(100.0)
    assert [px for px, _ in hits[0].split["buy"]] == pytest.approx([109.5, 100.0])  # 종가~하단 매수 우위


@pytest.mark.parametrize("fail,line,buys", [("low", 100.0, [110.0, 109.5]), ("close", 109.5, [110.0]),
                                            ("high", 110.0, [110.0])])
def test_box_breakout_fail_line_is_user_choice(fail, line, buys):
    prep = Prepared(_box_frame(111.8, retest=True), _cfg(box_fail=fail))
    hits = [p for p in evaluate_all(prep, len(prep.sig) - 1, TK)
            if p.setup == "박스" and p.box == pytest.approx((100.0, 110.0))]
    assert hits and hits[0].signal and hits[0].relation == "지지 확인"
    assert hits[0].fail_line == pytest.approx(line)
    assert [px for px, _ in hits[0].split["buy"]] == pytest.approx(buys)  # 철회선 위 지점만 매수


def test_doji_after_event_is_doji_box():
    """사건봉 → 바로 다음 봉 도지(104~108, 종가 106) → 상단 돌파 → 상단 눌림 → 반등.
    도지 외부 롱: 1차 상단, 2차 종가, 하단 종가 이탈이 최종 실패 (PART 8-3)."""
    rng = np.random.default_rng(5)
    n = 200
    c = 95 * np.exp(rng.normal(0, 0.003, n))
    o = c * (1 + rng.normal(0, 0.001, n))
    h = np.maximum(o, c) * 1.003
    lo = np.minimum(o, c) * 0.997
    v = np.full(n, 5e7)
    o[150], h[150], lo[150], c[150], v[150] = 96.0, 106.5, 95.8, 106.0, 5e8   # 사건봉
    o[151], h[151], lo[151], c[151], v[151] = 106.2, 108.0, 104.0, 106.0, 5e7  # 다음 봉 도지
    for k in range(152, n - 2):
        x = 112.0 if k < 185 else 110.0
        o[k], c[k], h[k], lo[k] = x, x * 1.001, x * 1.003, x * 0.997
    o[-2], h[-2], lo[-2], c[-2] = 109.0, 109.5, 108.2, 109.2   # 도지 상단 108 부근 눌림
    o[-1], h[-1], lo[-1], c[-1] = 109.3, 110.5, 109.1, 110.2   # 반등
    df = pd.DataFrame({"open": o, "high": h, "low": lo, "close": c, "volume": v},
                      index=pd.bdate_range(end="2026-10-23", periods=n))
    hits = [p for p in _plans(df) if p.setup == "도지" and p.box == pytest.approx((104.0, 108.0))]
    assert hits and hits[0].signal and hits[0].fail_line == pytest.approx(104.0)
    assert [px for px, _ in hits[0].split["buy"]] == pytest.approx([108.0, 106.0])


def test_event_requires_3x_and_300eok_on_kr_daily():
    from sr_bot.levels import detect_bar_levels
    cfg = load_config(market="kr", tf="D", level_tfs=("D",))
    idx = pd.bdate_range(end="2026-10-23", periods=60)
    df = pd.DataFrame({"open": 10_000.0, "high": 10_100.0, "low": 9_900.0, "close": 10_000.0,
                       "volume": 1_000_000.0}, index=idx)  # 평소 거래대금 100억
    df.iloc[40, df.columns.get_loc("volume")] = 4_000_000  # 400억 · 4배 → 사건봉
    df.iloc[50, df.columns.get_loc("volume")] = 2_500_000  # 250억 · 2.5배 → 아님
    lv, _ = detect_bar_levels(df, cfg.p, "D", cfg.m.event_min_value)
    events = [x.src for x in lv if x.kind == "event"]
    adjusts = [x.born for x in lv if x.kind == "adjust"]
    assert events == [idx[40]] and adjusts == [idx[41]]  # 조정봉 = 바로 다음 봉


def test_us_event_floor_is_1000eok_krw_converted():
    cfg = load_config(market="us", tf="D", fx_usd_krw=1250.0)
    assert cfg.event_min_local == pytest.approx(100_000_000_000 / 1250.0)  # $80M
    assert load_config(market="kr", tf="D").event_min_local == 30_000_000_000
