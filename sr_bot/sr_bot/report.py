"""HTML 리포트와 텔레그램 요약 문구."""
from __future__ import annotations

import html
from collections import Counter, defaultdict

import pandas as pd

from .levels import TF_LABEL
from .scanner import ScanResult
from .strategy import BOX_FAIL_LABEL, Plan
from .ticks import fmt_price

CSS = """
:root{--bg:#f7f6f2;--card:#fff;--ink:#1d2321;--muted:#5f6b66;--line:#e2e0d8;--accent:#14614a;
--hl:#fdf1c7;--hl-ink:#5a4300;--bad:#b3261e;--good:#1b7f4c;--zone:rgba(20,97,74,.12);--th:#f0efe9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131615;--card:#1b1f1d;--ink:#e7ebe9;
--muted:#9aa5a0;--line:#2c3330;--accent:#5fc59d;--hl:#3a3216;--hl-ink:#f2dc95;--bad:#ff8a80;--good:#6fd39b;
--zone:rgba(95,197,157,.14);--th:#222826}}
:root[data-theme="dark"]{--bg:#131615;--card:#1b1f1d;--ink:#e7ebe9;--muted:#9aa5a0;--line:#2c3330;--accent:#5fc59d;
--hl:#3a3216;--hl-ink:#f2dc95;--bad:#ff8a80;--good:#6fd39b;--zone:rgba(95,197,157,.14);--th:#222826}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.6 "Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h4{font-size:14px;margin:14px 0 4px;color:var(--muted)}h2{font-size:19px;margin:36px 0 10px}h3{font-size:17px;margin:0;color:var(--accent)}
.muted{color:var(--muted)}.small{font-size:13px}
.banner{background:var(--hl);color:var(--hl-ink);padding:12px 14px;border-radius:8px;margin:16px 0;font-weight:600}
.demo{background:var(--bad);color:#fff}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums}
.tbl{width:100%;overflow-x:auto}table{border-collapse:collapse;width:100%;background:var(--card);font-size:14px}
th,td{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;white-space:nowrap}
th{background:var(--th);font-weight:600}td.n{text-align:right;font-variant-numeric:tabular-nums}
tr.hl td{background:var(--hl);color:var(--hl-ink)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:16px 0}
.card.hl{border-color:#d9b84a}.kv{display:grid;grid-template-columns:150px 1fr;gap:0}
.kv div{padding:6px 8px;border-bottom:1px solid var(--line)}.kv div:nth-child(odd){color:var(--muted);background:var(--th)}
.tag{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line);margin-left:6px}
.tag.c{background:var(--hl);color:var(--hl-ink);border-color:transparent}
.warn{color:var(--bad)}svg{width:100%;height:auto;display:block;margin:10px 0}
ul{padding-left:20px}@media print{body{font-size:12px;background:#fff}main{padding:0}table{font-size:11px}
th,td{white-space:normal;padding:4px 5px}.card{break-inside:avoid}.stats{grid-template-columns:repeat(6,1fr)}}@media (max-width:560px){.kv{grid-template-columns:110px 1fr}h1{font-size:20px}}
"""


def _e(s) -> str:
    return html.escape(str(s))


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def chart_svg(bars: pd.DataFrame, plan: Plan, market: str) -> str:
    W, H, pad_l, pad_r, pad_y = 680, 240, 6, 64, 10
    lines = [plan.level, plan.stop] + [x for x in (plan.t1, plan.t2) if x]
    lo = min(bars["low"].min(), *lines)
    hi = max(bars["high"].max(), *lines)
    span = hi - lo or 1
    lo, hi = lo - span * 0.03, hi + span * 0.03
    n = len(bars)
    cw = (W - pad_l - pad_r) / max(n, 1)

    def y(p):
        return pad_y + (hi - p) / (hi - lo) * (H - 2 * pad_y)

    out = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{_e(plan.name)} 차트">']
    zy1, zy2 = y(plan.zone[1]), y(plan.zone[0])
    out.append(f'<rect x="{pad_l}" y="{zy1:.1f}" width="{W - pad_l - pad_r}" height="{max(zy2 - zy1, 1):.1f}" fill="var(--zone)"/>')
    if plan.box:
        out.append(f'<rect x="{pad_l}" y="{y(plan.box[1]):.1f}" width="{W - pad_l - pad_r}" '
                   f'height="{max(y(plan.box[0]) - y(plan.box[1]), 1):.1f}" fill="none" stroke="var(--muted)" stroke-dasharray="2 3"/>')
    for i, r in enumerate(bars.itertuples()):
        x = pad_l + i * cw + cw / 2
        up = r.close >= r.open
        col = "var(--good)" if up else "var(--bad)"
        out.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{y(r.high):.1f}" y2="{y(r.low):.1f}" stroke="{col}" stroke-width="1"/>')
        top, bot = y(max(r.open, r.close)), y(min(r.open, r.close))
        out.append(f'<rect x="{x - cw * 0.35:.1f}" y="{top:.1f}" width="{cw * 0.7:.1f}" height="{max(bot - top, 0.8):.1f}" fill="{col}"/>')

    specs = [(plan.level, "var(--accent)", "기준선", ""), (plan.stop, "var(--bad)", "손절 추정", "4 3")]
    if plan.t1:
        specs.append((plan.t1, "var(--good)", "1차", "4 3"))
    if plan.t2:
        specs.append((plan.t2, "var(--good)", "2차", "2 3"))
    label_y: list[float] = []
    for p, color, label, dash in sorted(specs, key=lambda s: -s[0]):
        yy = y(p)
        d = f' stroke-dasharray="{dash}"' if dash else ""
        out.append(f'<line x1="{pad_l}" x2="{W - pad_r}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{color}" stroke-width="1.4"{d}/>')
        ty = max(yy + 4, label_y[-1] + 12) if label_y else yy + 4  # 위에서부터 라벨이 겹치지 않게 내린다
        label_y.append(ty)
        out.append(f'<text x="{W - pad_r + 4}" y="{ty:.1f}" font-size="11" fill="{color}">{_e(label)}</text>')
    out.append("</svg>")
    return "".join(out)


def _detail(plan: Plan, rank: int, res: ScanResult) -> str:
    cfg, mk = res.cfg, res.cfg.market
    f = lambda p: fmt_price(p, mk)  # noqa: E731
    ev = plan.events
    q1 = [("관찰 이유", plan.why), ("기준선 관계", f"{plan.relation} · {plan.status}")]
    q2 = [
        ("핵심 기준선", f"{f(plan.level)}"),
        ("기준선 근거", plan.level_desc),
        ("격 (기능 수행 이력)", f"{plan.grade:.1f} · 지지 {ev['hold']} / 저항 {ev['reject']} / 전환 {ev['flip']}"
                              + (f" · 돌파 전 저항 {plan.pre_rejects}회" if plan.pre_rejects else "")),
    ]
    if plan.breakout_date is not None:
        q2.append(("돌파 봉", f"{plan.breakout_date:%Y-%m-%d} · 거래대금 {plan.breakout_vr:.2f}배"
                   + (" · 이후 거래대금 감소" if plan.pullback_dry else "")))
    if plan.box:
        q2.append(("박스 (저점~고점)", f"{f(plan.box[0])} ~ {f(plan.box[1])}"))
    sb = plan.split.get("buy", [])
    ss = plan.split.get("sell", [])
    q3 = [
        ("진입 조건", plan.entry_rule),
        ("매수 검토 구간", f"{f(plan.zone[0])} ~ {f(plan.zone[1])}"),
        ("분할매수", " → ".join(f"{f(px)} {w:.0%}" for px, w in sb)),
        ("계획 진입가", f(plan.entry)),
        ("1차 목표", f"{f(plan.t1)} · {plan.t1_desc}" if plan.t1 else "-"),
        ("2차 목표", f(plan.t2) if plan.t2 else "-"),
        ("분할익절", (" → ".join(f"{f(px)} {w:.0%}" for px, w in ss) + f" · {plan.split.get('after_t1', '')}") if ss else "-"),
        ("계획 순손익비", f"{plan.net_rr:.2f} · 왕복 비용 {_pct(plan.cost_pct)} 가정 (유동성 반영)" if plan.net_rr else "-"),
    ]
    q4 = [
        ("철회 조건", plan.fail_rule),
        ("손절 추정가", f"{f(plan.stop)} (진입 대비 -{_pct(plan.stop_pct)}) · 종가 이탈 후 체결 가정"),
    ]
    if plan.qty is not None:
        q4.append(("권장 최대 수량", f"{plan.qty:,}주 · 계좌 {cfg.account:,.0f}, 1회 위험 {_pct(cfg.risk_per_trade)}"))
    etc = [("초기 적합도", f"{plan.score:.1f}/100 · 상승확률 아님"), ("기준일 확정 종가", f(plan.close)),
           ("20일 거래대금 중앙값", f"{plan.turnover / 1e8:,.0f}억 원" if mk == "kr" else f"${plan.turnover / 1e6:,.1f}M")]
    etc += list(plan.info.items())

    def block(title, rows):
        kv = "".join(f"<div>{_e(k)}</div><div>{_e(v)}</div>" for k, v in rows)
        return f"<h4>{_e(title)}</h4><div class='kv'>{kv}</div>"

    warn = "".join(f'<li class="warn">{_e(w)}</li>' for w in plan.warnings)
    chart = chart_svg(res.charts[plan.code], plan, mk) if plan.code in res.charts else ""
    hl = " hl" if plan.signal else ""
    return (f'<section class="card{hl}"><h3>{rank}. {_e(plan.name)} ({_e(plan.code)})'
            f'<span class="tag{" c" if hl else ""}">{_e(plan.state_label)}</span></h3>'
            f'<p class="muted small">{_e(plan.sector)} · {TF_LABEL[plan.tf]} · 기준선 {f(plan.level)}</p>{chart}'
            + block("① 왜 관찰하는가", q1) + block("② 어떤 가격이 중요한가", q2)
            + block("③ 어떤 조건에서 매매하는가", q3) + block("④ 언제 판단을 철회하는가", q4)
            + block("참고", etc)
            + (f"<ul>{warn}</ul>" if warn else "") + "</section>")


def _table(rows: list[Plan], start: int, res: ScanResult) -> str:
    f = lambda p: fmt_price(p, res.cfg.market)  # noqa: E731
    out = ["<div class='tbl'><table><tr><th>순위</th><th>종목</th><th>섹터</th><th>유형</th><th>관계</th>"
           "<th>기준선</th><th>매수 검토 구간</th><th>1차 목표</th><th>순손익비</th><th>격</th><th>적합도</th></tr>"]
    for i, p in enumerate(rows, start):
        cls = " class='hl'" if p.signal else ""
        out.append(f"<tr{cls}><td>{i}</td><td>{_e(p.name)}</td><td>{_e(p.sector)}</td><td>{_e(p.state_label)}</td>"
                   f"<td>{_e(p.relation)}</td><td class='n'>{f(p.level)}</td>"
                   f"<td class='n'>{f(p.zone[0])} ~ {f(p.zone[1])}</td><td class='n'>{f(p.t1)}</td>"
                   f"<td class='n'>{p.net_rr:.2f}</td><td class='n'>{p.grade:.1f}</td><td class='n'>{p.score:.1f}</td></tr>")
    out.append("</table></div>")
    return "".join(out)


def render_html(res: ScanResult) -> str:
    cfg, mk = res.cfg, res.cfg.market
    f = lambda p: fmt_price(p, mk)  # noqa: E731
    tf = TF_LABEL[cfg.tf]
    elig, sigs, top = res.eligible, res.signals, res.top
    market_name = {"kr": "한국 주식", "us": "미국 주식"}[mk]
    unver = sum(res.unverified.values())

    parts = ["<!doctype html><html lang='ko'><head><meta charset='utf-8'>"
             "<meta name='viewport' content='width=device-width,initial-scale=1'>"
             f"<title>차트술사 기준선 리포트</title><style>{CSS}</style></head><body><main>"]
    parts.append(f"<h1>차트술사 기준선 리포트 · {market_name} {tf}</h1><p class='muted'>기준 거래일 {res.session:%Y-%m-%d} · "
                 f"확정 {tf} 기록 · 실시간 가격 아님 · 가격 단위: {'원' if mk == 'kr' else 'USD'}</p>")
    if res.demo:
        parts.append("<div class='banner demo'>데모: 가상 데이터로 만든 리포트입니다. 실제 종목·시세가 아닙니다.</div>")
    if not sigs:
        parts.append("<div class='banner'>이번 회차는 매매 조건을 충족한 종목이 없습니다 → 무포지션 유지(원칙 ⑦). "
                     "아래는 조건이 생기면 대응할 관찰 후보입니다.</div>")
    else:
        parts.append(f"<div class='banner'>매매 조건 충족 {len(sigs)}개를 맨 위에 노랑으로 표시했습니다. "
                     "종목 발견과 매수 신호는 다릅니다 — 관찰 후보는 조건이 생길 때만 대응합니다.</div>")

    reasons = ", ".join(f"{k} {v}" for k, v in res.unverified.most_common()) or "없음"
    setups = Counter(p.setup for p in sigs)
    parts.append("<div class='stats'>" + "".join(
        f"<div class='stat'><span class='muted small'>{k}</span><b>{v}</b></div>" for k, v in (
            ("전체 점검", res.checked), ("평가 가능", res.evaluable), ("자료 미검증", unver),
            ("구조 발견", len(res.plans)), ("적격", len(elig)), ("조건 충족", len(sigs)))) + "</div>")
    parts.append(f"<p class='small muted'>자료 미검증 사유: {_e(reasons)} · 조건 충족 유형: "
                 f"{_e(', '.join(f'{k} {v}' for k, v in setups.items()) or '없음')}</p>")

    sig_top = [p for p in top if p.signal]
    watch_top = [p for p in top if not p.signal]
    if sig_top:
        parts.append(f"<h2>매매 조건 충족 ({len(sig_top)})</h2>" + _table(sig_top, 1, res))
    if watch_top:
        parts.append(f"<h2>관찰 후보 ({len(watch_top)})</h2>" + _table(watch_top, len(sig_top) + 1, res))
    parts.append("<p class='small muted'>순위: 적격 → 조건 충족 → 유형(눌림·도지·박스·저점·돌파) → 적합도 → 순손익비 → 종목코드. "
                 "순손익비는 현재가가 아니라 계획 진입가 기준이며 유동성에 따라 비용을 다르게 잡았습니다.</p>")

    parts.append(f"<h2>상세 시나리오 (상위 {min(cfg.detail_n, len(top))})</h2>")
    for i, p in enumerate(top[: cfg.detail_n], 1):
        parts.append(_detail(p, i, res))

    by_sec: dict[str, list] = defaultdict(list)
    for i, p in enumerate(top, 1):
        by_sec[p.sector].append(f"{p.name}({i})")
    all_sec = Counter(p.sector for p in elig)
    parts.append("<h2>상위 종목의 업종 분포</h2><div class='tbl'><table><tr><th>업종</th><th>상위/적격</th><th>종목 (순위)</th></tr>")
    for sec, names in sorted(by_sec.items(), key=lambda x: -len(x[1])):
        parts.append(f"<tr><td>{_e(sec)}</td><td class='n'>{len(names)}/{all_sec[sec]}</td><td>{_e(' · '.join(names))}</td></tr>")
    parts.append("</table></div>")

    rej = Counter(r.split(" ")[0] for p in res.plans if not p.eligible for r in p.reject)
    if rej:
        parts.append("<p class='small muted'>구조는 있지만 가격 계획에서 탈락: " +
                     _e(", ".join(f"{k} {v}" for k, v in rej.most_common())) + "</p>")

    p = cfg.p
    parts.append(f"""<h2>판정 기준과 한계</h2><ul class='small'>
<li>관찰 이유: 거래대금 급증(직전 {p.vol_window}봉 평균의 {p.high_vol_mult:g}배 이상). 거래대금은 상승 확신이 아니라 관찰 종목을 고르는 근거입니다.</li>
<li>기준선: 거래대금 급증봉 종가, 급증 후 조정봉 종가, 박스 고점·종가·저점, 추세 강화 도지 종가, 종가 클러스터. 실제 봉 가격만 쓰므로 호가 단위에 맞습니다. 일·주·월봉에서 겹치면 격에 가점.</li>
<li>유형: 눌림(돌파 후 재접근 지지) · 도지(거래대금 급증 다음 봉 도지 박스) · 박스(추세전환 직전 봉 / 거래량 급증봉 박스) · 저점(반복 바닥 지지) · 돌파(거래대금 동반 종가 돌파 / 저항 아래 대기).</li>
<li>박스: 봉의 고점~저점. 고점·종가·저점 3분할 매수. 박스 안에서는 저점 이탈 시 철회, 박스 돌파 후에는 <b>박스 {BOX_FAIL_LABEL[cfg.box_fail]}</b> 이탈 시 철회(사용자 설정 `box_fail`), 철회선 아래 매수 지점은 제외.</li>
<li>모든 지지·저항 전환과 철회는 종가 기준입니다. 손절 추정가는 철회선 -{_pct(p.fail_slip)} 체결 가정입니다.</li>
<li>가격 필터: 20일 거래대금 중앙값 {f(cfg.m.min_turnover) if mk == 'us' else f'{cfg.m.min_turnover / 1e8:,.0f}억 원'} 이상, 순손익비 {cfg.min_net_rr} 이상, 손절 폭 {_pct(cfg.max_stop_pct)} 이하, 목표 가격차 {_pct(cfg.min_target_gap)} 이상.</li>
<li>분할매수(구간 상단 50% → 기준선 부근 50%)와 분할익절(1차 50% → 2차 50%, 1차 후 본전 손절)은 기본안입니다.</li>
<li>이동평균 배열·주봉 저점 상승은 이론에 없는 지표라 점수에 넣지 않고 참고로만 표시합니다. 수급(투자자별 매매)은 아직 반영하지 않습니다.</li>
<li>적합도 점수는 상승확률이 아닙니다. 공시·재무·뉴스 미반영, 체결·목표 도달 보장 없음, 자동 주문 없음.</li>
</ul></main></body></html>""")
    return "".join(parts)


def telegram_summary(res: ScanResult, n: int = 5) -> str:
    mk = res.cfg.market
    f = lambda p: fmt_price(p, mk)  # noqa: E731
    head = (f"[차트술사 기준선 · {'한국' if mk == 'kr' else '미국'} {TF_LABEL[res.cfg.tf]}] {res.session:%Y-%m-%d}\n"
            f"점검 {res.checked} · 적격 {len(res.eligible)} · 조건 충족 {len(res.signals)}")
    if res.demo:
        head = "[데모·가상 데이터]\n" + head
    lines = [head]
    if not res.signals:
        lines.append("조건 충족 없음 → 무포지션 유지 (관찰 후보만)")
    for i, p in enumerate(res.top[:n], 1):
        lines.append(f"{i}. {p.name} [{p.state_label}] 기준선 {f(p.level)} · 구간 {f(p.zone[0])}~{f(p.zone[1])} · "
                     f"1차 {f(p.t1)} · 손익비 {p.net_rr:.2f}")
    lines.append("종가 기준 판정 · 상승확률 아님 · 자동 주문 없음")
    return "\n".join(lines)


def plans_frame(res: ScanResult) -> pd.DataFrame:
    rows = []
    for p in res.plans:
        rows.append({
            "code": p.code, "name": p.name, "sector": p.sector, "eligible": p.eligible, "setup": p.setup,
            "signal": p.signal, "relation": p.relation, "status": p.status, "score": round(p.score, 1),
            "level": p.level, "fail_line": p.fail_line, "zone_lo": p.zone[0], "zone_hi": p.zone[1],
            "entry": p.entry, "stop": p.stop, "t1": p.t1, "t2": p.t2,
            "net_rr": round(p.net_rr, 2) if p.net_rr else None, "grade": round(p.grade, 1),
            "why": p.why, "level_desc": p.level_desc, "reject": "; ".join(p.reject),
            "warnings": "; ".join(p.warnings), "qty": p.qty,
        })
    return pd.DataFrame(rows)
