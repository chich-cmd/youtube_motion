import pandas as pd
import pytest

from sr_bot import levels as L
from sr_bot.backtest import backtest_ticker, summarize
from sr_bot.config import load_config
from sr_bot.data import Ticker, resample, validate
from sr_bot.strategy import Prepared, evaluate
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


def test_pullback_confirmed_on_planted_level():
    plan = evaluate(Prepared(_pattern(), _cfg()), len(_pattern()) - 1, TK)
    assert plan is not None
    assert plan.level == pytest.approx(100.0)
    assert plan.state == "confirmed"
    assert plan.eligible
    assert plan.zone[0] <= plan.entry <= plan.zone[1]
    assert plan.stop < plan.level < plan.entry < plan.t1
    assert plan.pre_rejects >= 1
    assert plan.net_rr >= 1.5


def test_close_below_level_invalidates():
    df = _pattern()
    df.iloc[-1, df.columns.get_loc("close")] = 99.0  # 종가가 기능선 아래로 마감
    df.iloc[-1, df.columns.get_loc("low")] = 98.5
    plan = evaluate(Prepared(df, _cfg()), len(df) - 1, TK)
    assert plan is None or plan.level != pytest.approx(100.0)


def test_no_lookahead():
    """t 시점 판정은 t 이후 데이터가 있어도 같아야 한다."""
    full = _pattern(tail=15)
    t = len(full) - 16
    a = evaluate(Prepared(full, _cfg()), t, TK)
    b = evaluate(Prepared(full.iloc[: t + 1], _cfg()), t, TK)
    assert (a.level, a.state, a.entry, a.t1, a.stop) == (b.level, b.state, b.entry, b.t1, b.stop)


def test_levels_are_actual_prices():
    df = random_walk(800, seed=3)
    cfg = _cfg()
    prices = set(df["close"]) | set(df["high"]) | set(df["low"])
    lv = L.detect_bar_levels(df, cfg.p, "D") + L.detect_clusters(df, cfg.p, "D")
    assert lv and all(x.price in prices for x in lv)
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
    assert trades and trades[0].outcome == "target"
    assert summarize(trades)["trades"] == len(trades)


def test_position_size_respects_risk():
    cfg = _cfg(account=10_000_000, risk_per_trade=0.01)
    df = _pattern()
    plan = evaluate(Prepared(df, cfg), len(df) - 1, TK)
    loss = plan.qty * (plan.entry - plan.stop + plan.entry * plan.cost_pct)
    assert 0 < loss <= 10_000_000 * 0.01 + 1e-6
