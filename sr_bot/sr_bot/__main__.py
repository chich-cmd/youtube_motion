"""명령줄 진입점.

  python -m sr_bot scan --market kr --tf W
  python -m sr_bot scan --market us --tf D --universe sp500 --telegram   # S&P 500, 사건봉 5,000억 원 이상
  python -m sr_bot scan --market us --tf D --universe ndx               # 나스닥-100, 2,000억 원 이상
  python -m sr_bot backtest --market us --tf D --universe AAPL,MSFT,NVDA
  python -m sr_bot demo           # 네트워크 없이 가상 데이터로 리포트 생성
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from . import data as D
from .backtest import backtest_ticker, format_summary, summarize
from .config import load_config
from .notify import telegram
from .report import plans_frame, render_html, telegram_summary
from .scanner import scan
from .ticks import round_tick

ROOT = Path(__file__).resolve().parent.parent


def _with_fx(cfg):
    """원화로 정한 사건봉 하한(S&P 500 5,000억 원, 나스닥-100 2,000억 원 등)을 쓰는 시장이면 실시간 환율을 받아 넣는다."""
    if cfg.market != "kr" and cfg.event_min_krw:
        from dataclasses import replace

        cfg = replace(cfg, fx_usd_krw=D.usd_krw(cfg.fx_usd_krw))
        print(f"사건봉 하한({cfg.universe or '기본'}): {cfg.event_min_krw / 1e8:,.0f}억 원 ≈ ${cfg.event_min_local / 1e6:,.1f}M "
              f"(환율 {cfg.fx_usd_krw:,.1f}원)", file=sys.stderr)
    return cfg


def _cfg(a):
    return _with_fx(load_config(a.config, market=a.market, tf=a.tf, account=a.account, top_n=a.top,
                                box_fail=a.box_fail, universe=_uni_key(a.universe)))


def _uni_key(universe: str | None) -> str | None:
    """대상별 설정을 찾을 이름 (sp500, ndx, ...). 파일 경로·종목 목록이면 None."""
    return universe if universe in ("sp500", "ndx", "all", "nasdaq", "krx") else None


def html_to_pdf(html_path: Path) -> Path | None:
    """Chromium(Playwright)으로 HTML 리포트를 A4 PDF로 변환. Playwright가 없으면 건너뛴다."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("PDF 생략: pip install playwright && playwright install chromium", file=sys.stderr)
        return None
    import os

    pdf = html_path.with_suffix(".pdf")
    exe = os.getenv("CHROMIUM_PATH") or None
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe)
        pg = b.new_page()
        pg.goto(html_path.resolve().as_uri())
        pg.pdf(path=str(pdf), format="A4", print_background=True,
               margin={"top": "10mm", "bottom": "10mm", "left": "8mm", "right": "8mm"})
        b.close()
    return pdf


def _write(res, out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    uni = f"_{res.cfg.universe}" if res.cfg.universe else ""
    stem = f"{res.cfg.market}{uni}_{res.cfg.tf}_{res.session:%Y%m%d}" + ("_demo" if res.demo else "")
    html_path = out / f"{stem}.html"
    html_path.write_text(render_html(res), encoding="utf-8")
    plans_frame(res).to_csv(out / f"{stem}.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(res.lines).to_csv(out / f"{stem}_lines.csv", index=False, encoding="utf-8-sig")  # 기준선 DB
    return html_path


def cmd_scan(a) -> int:
    cfg = _cfg(a)
    if a.data_dir:
        tickers, frames = D.load_dir(a.data_dir)
        for t in tickers:
            t.market = cfg.market
    else:
        tickers = D.load_universe(cfg.market, a.universe, prefilter=cfg.m.min_turnover * 0.3)
        if a.limit:
            tickers = tickers[: a.limit]
        print(f"종목 {len(tickers)}개 수집 중…", file=sys.stderr)
        frames = D.fetch_all(tickers, cfg.market, cfg.history_years)
    session = D.expected_session(cfg.m.tz, cfg.m.close_hour)
    if a.asof:
        session = pd.Timestamp(a.asof)
    else:
        session = D.reference_session(frames, session)
    res = scan(cfg, tickers, frames, session)
    if res.evaluable == 0:
        print(f"평가 가능한 종목이 없습니다 ({dict(res.unverified)}). 네트워크·데이터 소스를 확인하세요.", file=sys.stderr)
        return 2
    path = _write(res, Path(a.out))
    files = [path]
    if a.pdf and (pdf := html_to_pdf(path)):
        files.append(pdf)
    summary = telegram_summary(res)
    print(summary)
    print("\n리포트: " + ", ".join(map(str, files)))
    if a.telegram and not telegram(summary, files[-1:]):
        print("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 가 없어 전송하지 않았습니다.", file=sys.stderr)
    return 0


def _bt_job(args):
    df, cfg, tk, start = args
    return backtest_ticker(df, cfg, tk, start=start, include_open=start is not None)


def cmd_backtest(a) -> int:
    from concurrent.futures import ProcessPoolExecutor

    cfg = _with_fx(load_config(a.config, market=a.market, tf=a.tf, history_years=a.years, box_fail=a.box_fail,
                               universe=_uni_key(a.universe)))
    tickers = D.load_universe(cfg.market, a.universe, prefilter=cfg.m.min_turnover * 0.3)
    if a.limit:
        tickers = tickers[: a.limit]
    frames = D.fetch_all(tickers, cfg.market, cfg.history_years, cache_hours=a.cache_hours)
    end = D.reference_session(frames, D.expected_session(cfg.m.tz, cfg.m.close_hour))
    if a.start:
        start = pd.Timestamp(a.start)
    elif a.months:
        start = end - pd.DateOffset(months=a.months) + pd.Timedelta(days=1)
    else:
        start = None
    jobs = []
    for tk in tickers:
        df = frames.get(tk.code)
        if df is None or len(df) < 300:
            continue
        df = df.loc[:end]
        if start is not None:
            # 기간 시작 시점에 유동성 필터를 통과하지 못하면 적격이 될 수 없으므로 건너뛴다
            before = df.loc[:start]
            if len(before) < 260 or D.median_turnover(before) < cfg.m.min_turnover * 0.5:
                continue
        jobs.append((df, cfg, tk, start))
    span = f"{start:%Y-%m-%d} ~ {end:%Y-%m-%d}" if start is not None else f"~ {end:%Y-%m-%d}"
    print(f"백테스트 {span} · {len(jobs)}종목 (전체 {len(tickers)})", file=sys.stderr)
    trades = []
    with ProcessPoolExecutor(a.workers) as ex:
        for i, tr in enumerate(ex.map(_bt_job, jobs, chunksize=8), 1):
            trades += tr
            if i % 200 == 0:
                print(f"{i}/{len(jobs)} 종목 · 누적 거래 {len(trades)}", file=sys.stderr)
    s = summarize(trades)
    print(format_summary(s))
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    stem = f"backtest_{cfg.market}{'_' + cfg.universe if cfg.universe else ''}_{cfg.tf}" + \
        (f"_{start:%Y%m%d}_{end:%Y%m%d}" if start is not None else "")
    pd.DataFrame([asdict(t) for t in trades]).to_csv(out / f"{stem}.csv", index=False, encoding="utf-8-sig")
    (out / f"{stem}.json").write_text(json.dumps(s, ensure_ascii=False, indent=2, default=str))
    from .report import render_backtest_html

    html_path = out / f"{stem}.html"
    html_path.write_text(render_backtest_html(cfg, trades, s, start, end, len(jobs)), encoding="utf-8")
    files = [html_path] + ([p] if a.pdf and (p := html_to_pdf(html_path)) else [])
    print("\n리포트: " + ", ".join(map(str, files)))
    return 0


def cmd_demo(a) -> int:
    from .synthetic import pullback_pattern, random_walk

    cfg = load_config(a.config, market="kr", tf="D", account=a.account or 30_000_000)
    tickers, frames = [], {}
    sectors = ["반도체·디스플레이", "기계·산업장비", "바이오·의료기기", "금융·지주", "IT·소프트웨어"]
    for i in range(40):
        code = f"DEMO{i:02d}"
        if i % 4 == 0:
            df = pullback_pattern(seed=i, R=float(10_000 + 1_000 * i), tail=1)
            df = pd.concat([random_walk(400, df.close.iloc[0], seed=100 + i, end=df.index[0] - pd.offsets.BDay(1)), df])
        else:
            df = random_walk(1200, 5_000 + 700 * i, seed=i)
        for col in ("open", "high", "low", "close"):
            df[col] = [round_tick(x, "kr") for x in df[col]]
        df["high"] = df[["open", "high", "close"]].max(axis=1)
        df["low"] = df[["open", "low", "close"]].min(axis=1)
        df["volume"] = (df["volume"] * 2_000_000 / df["close"]).round(0)
        frames[code] = df
        tickers.append(D.Ticker(code, f"가상종목{i:02d}", sectors[i % len(sectors)], "kr"))
    session = D.reference_session(frames, max(f.index[-1] for f in frames.values()))
    res = scan(cfg, tickers, frames, session, demo=True)
    path = _write(res, Path(a.out))
    files = [path] + ([p] if a.pdf and (p := html_to_pdf(path)) else [])
    print(telegram_summary(res))
    print("\n리포트: " + ", ".join(map(str, files)))
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="sr_bot", description="지지저항 구조 기반 눌림매매 스캐너")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("scan", "backtest", "demo"):
        s = sub.add_parser(name)
        s.add_argument("--config", default=str(ROOT / "config.toml"))
        s.add_argument("--market", choices=["kr", "us"])
        s.add_argument("--tf", choices=["D", "W", "M"])
        s.add_argument("--universe", help="sp500 | ndx | all(S&P500+나스닥100) | nasdaq(나스닥 상장 전체) | CSV 경로 | 쉼표 구분 코드")
        s.add_argument("--limit", type=int, default=0)
        s.add_argument("--account", type=float, help="계좌 금액 (수량 계산용)")
        s.add_argument("--top", type=int)
        s.add_argument("--box-fail", choices=["high", "close", "low"],
                       help="박스 돌파 후 철회 기준: 박스 고점/종가/저점 아래 종가 (기본 config.toml)")
        s.add_argument("--out", default=str(ROOT / "reports"))
        s.add_argument("--pdf", action="store_true", help="HTML과 함께 PDF도 저장 (playwright 필요)")
        if name == "scan":
            s.add_argument("--asof", help="YYYY-MM-DD 과거 기준일로 스캔")
            s.add_argument("--data-dir", help="종목별 일봉 CSV 폴더 (인터넷 없이 실행)")
            s.add_argument("--telegram", action="store_true")
        if name == "backtest":
            s.add_argument("--years", type=int, default=10, help="받을 시세 이력 (기준선 계산용)")
            s.add_argument("--months", type=int, default=0, help="최근 N개월 신호만 검증 (미청산 거래는 마지막 종가로 평가)")
            s.add_argument("--start", help="YYYY-MM-DD 이후 신호만 검증")
            s.add_argument("--workers", type=int, default=4)
            s.add_argument("--cache-hours", type=float, default=10)
    a = ap.parse_args(argv)
    return {"scan": cmd_scan, "backtest": cmd_backtest, "demo": cmd_demo}[a.cmd](a)


if __name__ == "__main__":
    raise SystemExit(main())
