"""설정값.

차트술사 이론 완전판(2026-10-24)에서 **확정된 수치**는 주석에 [확정]으로 표시했다.
나머지는 이론에 수치가 없어(PART 19 미확정 항목) 코드로 옮기기 위해 정한 **구현 설정값**이며,
차트술사 규칙이 아니다. 백테스트로 검증하면서 조정하는 것을 전제로 한다.
`config.toml`에서 같은 이름으로 덮어쓸 수 있다.
"""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field, fields, replace
from pathlib import Path


@dataclass(frozen=True)
class TFParams:
    """시간 프레임(D/W/M)별 구조 판정 파라미터."""

    # 사건봉: 현재 봉을 제외한 직전 20개 봉 평균 대비 거래대금 3배 이상 [확정]
    # (거래량 급증 박스도 같은 배수를 쓴다 — 구현 설정값)
    vol_window: int = 20
    high_vol_mult: float = 3.0
    # 장대봉: 직전 평균 봉 길이 대비 배수, 몸통 비율
    long_range_mult: float = 1.5
    long_body_ratio: float = 0.5
    # 도지: 몸통/전체 길이 (도지 몸통 비율은 미확정 — 구현 설정값)
    doji_body_ratio: float = 0.3
    # 추세 강화 도지: 같은 방향 봉이 연속 몇 개 이상
    trend_run: int = 3
    # 초고거래량(부록 A): 과거 mega_window개 봉 중 최대 거래량 양봉
    mega_window: int = 700
    mega_min_bars: int = 250
    # 종가 클러스터: 최근 cluster_window개 종가 중 cluster_tol 폭 안에 cluster_min개 이상
    cluster_window: int = 250
    cluster_tol: float = 0.010
    cluster_min: int = 6
    cluster_every: int = 20  # 백테스트에서 몇 봉마다 클러스터를 다시 계산할지
    # 여러 봉 박스(횡보): box_len봉 안에서 고저 폭 box_width 이하, 상·하단 각각 box_touch회 이상 반응
    # (박스 길이·반응 조건은 미확정 — 구현 설정값)
    box_len: int = 20
    box_width: float = 0.15
    box_touch: int = 2
    # 같은 가격대로 보는 범위(선 병합) / 선 터치 판정 허용 폭
    merge_tol: float = 0.006
    touch_tol: float = 0.004
    event_dedupe: int = 3
    # 눌림매매 판정
    max_bars_since_break: int = 60   # 돌파 후 이 봉 수 안의 재접근만 본다 (초고거래량 선은 예외)
    pre_window: int = 120            # 돌파 전 저항 흔적을 찾는 구간
    min_prior_rejects: int = 1       # "저항선을 계속 뚫지 못한 흔적" 최소 횟수
    retest_zone: float = 0.015       # 기능선 위 이 폭 안까지 내려오면 재접근
    confirm_bars: int = 3            # 눌림 후보 봉 이후 몇 봉 안에 반등이 나오면 '지지 확인'으로 볼지
    entry_buffer: float = 0.015      # 매수 검토 구간 상단 = 기능선 × (1 + entry_buffer)
    max_dist: float = 0.15           # 기능선이 종가의 85% 이상일 때만 후보
    fail_slip: float = 0.015         # 종가 이탈 시 예상 체결가 = 기능선 × (1 - fail_slip)
    swing_window: int = 250          # 목표 저항 후보로 쓰는 과거 고점 구간
    max_hold: int = 40               # 백테스트 시간 청산


DEFAULT_TF = {
    "D": TFParams(),
    "W": TFParams(
        mega_window=150, mega_min_bars=60, cluster_window=104, cluster_tol=0.015,
        cluster_min=5, cluster_every=4, merge_tol=0.01, touch_tol=0.006,
        max_bars_since_break=26, pre_window=52, retest_zone=0.03, entry_buffer=0.025,
        fail_slip=0.03, swing_window=104, max_hold=26, box_len=12, box_width=0.25,
    ),
    "M": TFParams(
        mega_window=36, mega_min_bars=24, cluster_window=60, cluster_tol=0.02,
        cluster_min=4, cluster_every=1, merge_tol=0.015, touch_tol=0.01,
        max_bars_since_break=12, pre_window=36, retest_zone=0.05, entry_buffer=0.04,
        fail_slip=0.05, swing_window=60, max_hold=12, box_len=8, box_width=0.35,
    ),
    # 연봉: 확정된 연봉 종가만 기준선으로 쓴다 (최상위 격)
    "Y": TFParams(vol_window=3, merge_tol=0.015, touch_tol=0.01, cluster_window=20, cluster_min=99),
}


@dataclass(frozen=True)
class MarketParams:
    currency: str
    base_cost: float           # 왕복 수수료·세금
    min_turnover: float        # 20일 거래대금 중앙값 하한 (현지 통화)
    # (거래대금 상한, 추가 슬리피지) 순서대로 적용. 유동성이 낮을수록 비용을 크게 잡는다.
    slippage_tiers: tuple = ()
    tz: str = "UTC"
    close_hour: int = 16
    # 사건봉 절대 거래대금 하한 (일봉). 국내 300억 원 [확정]. 미국은 미확정이라 기본 0(상대 배수만).
    event_min_value: float = 0.0


DEFAULT_MARKETS = {
    "kr": MarketParams(
        currency="원", base_cost=0.0025, min_turnover=1_000_000_000,
        slippage_tiers=((3e9, 0.004), (1e10, 0.002), (5e10, 0.001)),
        tz="Asia/Seoul", close_hour=16, event_min_value=30_000_000_000,
    ),
    "us": MarketParams(
        currency="$", base_cost=0.001, min_turnover=20_000_000,
        slippage_tiers=((5e7, 0.002), (2e8, 0.001)),
        tz="America/New_York", close_hour=17,
    ),
}


@dataclass(frozen=True)
class Config:
    market: str = "kr"
    tf: str = "W"
    # 기능선을 찾을 때 함께 볼 상위/하위 프레임
    level_tfs: tuple = ("D", "W", "M", "Y")
    history_years: int = 6
    # 가격 계획 필터
    min_net_rr: float = 1.5
    min_target_gap: float = 0.01
    max_stop_pct: float = 0.08
    # 박스 돌파 후 철회 기준 (사용자 선택): high=박스 고점, close=박스 종가, low=박스 저점 아래 종가 마감 시 철회
    box_fail: str = "low"
    # 도지 박스: 기본은 사건봉 바로 다음 봉이 도지일 때만. True면 평균 이상 길이의 모든 도지 (이론 8-5: 위치 제한 없음)
    doji_any: bool = False
    # 계좌·리스크 (공부법 1장: 단일 트레이드 손실은 계좌의 일정 비율 이하)
    account: float = 0.0          # 0이면 수량 계산 생략
    risk_per_trade: float = 0.01
    max_position_pct: float = 0.20
    max_adv_pct: float = 0.01     # 20일 평균 거래량 대비 최대 수량 비율
    # 출력
    top_n: int = 20
    detail_n: int = 10
    tf_params: dict = field(default_factory=lambda: dict(DEFAULT_TF))
    markets: dict = field(default_factory=lambda: dict(DEFAULT_MARKETS))

    @property
    def p(self) -> TFParams:
        return self.tf_params[self.tf]

    @property
    def m(self) -> MarketParams:
        return self.markets[self.market]


def _apply(obj, overrides: dict):
    names = {f.name for f in fields(obj)}
    unknown = set(overrides) - names
    if unknown:
        raise ValueError(f"알 수 없는 설정: {sorted(unknown)}")
    vals = {k: tuple(map(tuple, v)) if isinstance(v, list) and v and isinstance(v[0], list)
            else tuple(v) if isinstance(v, list) else v for k, v in overrides.items()}
    return replace(obj, **vals)


def load_config(path: str | Path | None = None, **overrides) -> Config:
    cfg = Config()
    if path:
        data = tomllib.loads(Path(path).read_text(encoding="utf-8"))
        tfp = dict(cfg.tf_params)
        for tf, ov in data.pop("tf_params", {}).items():
            tfp[tf] = _apply(tfp[tf], ov)
        mk = dict(cfg.markets)
        for name, ov in data.pop("market_params", {}).items():
            mk[name] = _apply(mk[name], ov)
        cfg = _apply(cfg, data)
        cfg = replace(cfg, tf_params=tfp, markets=mk)
    overrides = {k: v for k, v in overrides.items() if v is not None}
    if overrides:
        cfg = _apply(cfg, overrides)
    if cfg.tf not in ("D", "W", "M"):
        raise ValueError("tf는 D, W, M 중 하나")
    if cfg.box_fail not in ("high", "close", "low"):
        raise ValueError("box_fail은 high, close, low 중 하나")
    if cfg.market not in cfg.markets:
        raise ValueError("market은 kr 또는 us")
    return cfg
