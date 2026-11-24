"""Map source-time annotations onto the cut timeline -> motion/src/tip/rp9.json, sfx_events.json, rp9.srt"""
import json, re, numpy as np
plan = json.load(open('plan.json')); ds = json.load(open('piece_durs.json')); tr = json.load(open('tr.json'))
o = 0; M = []
for (s, e, sp, k), d in zip(plan, ds): M.append((s, e, o, d)); o += d
TOT = o
def T(t):  # source -> output
    for s, e, a, d in M:
        if t < s: return a
        if t <= e: return a + (t - s) / (e - s) * d
    return TOT
FIX = [('상영카', '황영카'), ('이그젠 뽀유나', 'EXAM4YOU나'), ('아인카', '아잉카'), ('책 GPT', '챗GPT'), ('그러니까 GPT에', '그러니까 챗GPT에'), ('급하면 이렇게 GPT를', '급하면 이렇게 챗GPT를'),
       ('R-Inclined 2는', 'are inclined to는'), ('스팬드는', 'spend는'), ('업법', '어법'), ('안어채우기', '단어 채우기'), ('플러스웨이팅', 'fluctuating'),
       ('메이킹 어스', 'making us'), ('메이킹부터', 'making부터'), ('브레인까지', 'brain까지'), ('끊어왔기 전략', '끊어 읽기 전략'), ('정우답', '정오답'),
       ('겉만', '것만'), ('모든 질문에', '모든 지문에'), ('일치하는 의무', '상응하는 의무'), ('내 내용 숙지', '내용 숙지'), ('저희 풀 시간이', '풀 시간이'), ('팬인 자신에게', '팬인 자신에게')]
KEY = ['20점', '내용 숙지', '해설지', '황영카', '한글 해석', '형광펜', '요약', '챗GPT', '변형 문제', '표시', '정오답', '별표', '서술형', '단어 채우기', '어법 채우기', '영작',
       '덩어리', '끊어', '전문가', '어법', '중요 단어', '1순위', '2단계', '세 번째', '오른쪽', '매칭', 'EXAM4YOU', '아잉카', '스스로']
MAXC = 24
def clean(t):
    t = t.strip()
    for a, b in FIX: t = t.replace(a, b)
    return re.sub(r'[.,]+(\s|$)', r'\1', t).strip()
# source word times mapped onto the (exact) cut timeline
tro = [{'w': [[T(w[0]), T(w[1]), w[2]] for w in seg['w']]} for seg in tr]
def fixspans(raw):
    sp = []
    for k, _ in FIX:
        i = raw.find(k)
        while i >= 0: sp.append((i, i + len(k))); i = raw.find(k, i + 1)
    return sp
out = []
for seg in tro:
    ws = [w for w in seg['w'] if w[2].strip()]
    if not ws: continue
    toks = [w[2].strip() for w in ws]
    raw = ' '.join(toks); bad = fixspans(raw)
    pos = []; c = 0
    for tk in toks: pos.append(c); c += len(tk) + 1
    def ok(i): return not any(a < pos[i] - 1 < b for a, b in bad)
    chunks = [(0, len(ws))]
    while True:
        nc, ch = [], False
        for a0, b0 in chunks:
            txt = clean(' '.join(toks[a0:b0]))
            cand = [i for i in range(a0 + 1, b0) if ok(i)]
            if len(txt) <= MAXC or not cand: nc.append((a0, b0)); continue
            L = len(txt); i = min(cand, key=lambda i: abs(len(' '.join(toks[a0:i])) - L / 2)); nc += [(a0, i), (i, b0)]; ch = True
        chunks = nc
        if not ch: break
    for a0, b0 in chunks:
        t = clean(' '.join(toks[a0:b0]))
        if t: out.append([ws[a0][0], ws[b0 - 1][1], t])
lines = out; out = []
for j, (a, b, t) in enumerate(lines):
    nxt = lines[j + 1][0] if j + 1 < len(lines) else b + 0.6
    e = nxt if nxt - b < 0.6 else b + 0.3
    for k in KEY:
        if k in t: t = t.replace(k, '{' + k + '}', 1); break
    out.append({'s': round(a, 3), 'e': round(e, 3), 'text': t})
for j in range(len(out) - 1): out[j]['e'] = min(out[j]['e'], out[j + 1]['s'])
# sidebar state (source time): step 0 intro, recap>0 = summary
ST = [(0, 0, 0, 0), (22.9, 1, 0, 0), (87.2, 1, 1, 0), (150.3, 1, 2, 0), (206.3, 1, 3, 0), (278.2, 2, 0, 0), (286.0, 2, 1, 0), (314.8, 2, 2, 0),
      (366.0, 3, 0, 0), (375.7, 3, 1, 0), (387.4, 3, 2, 0), (443.0, 4, 0, 0), (448.5, 4, 0, 1), (459.1, 4, 0, 2), (471.1, 4, 0, 3), (484.6, 4, 0, 0)]
states = [{'s': round(T(s), 3), 'step': st, 'sub': sb, 'recap': rc} for s, st, sb, rc in ST]
CH = [(22.9, 'STEP 1', '내용 숙지'), (278.2, 'STEP 2', '변형 문제로 공부'), (366.0, 'STEP 3', '서술형 대비'), (443.0, '총정리', '벼락치기 3단계')]
chapters = [{'s': round(T(s), 3), 'e': round(T(s) + 2.6, 3), 'tag': a, 'title': b} for s, a, b in CH]
CARDS = [(26.9, 35.2, '1순위', '혼자 해석 뚫지 말고\n{해설지} 끼고 시작'), (39.1, 46.5, '자료 구하기', '{황영카} 같은 카페에\n해석 파일 무료 공유'),
  (52.9, 61.8, '① 먼저', '{한글 해석} 읽고\n문장마다 요약'), (88.0, 94.5, '② 다음', '영어 지문 해석하며\n{내용 떠올리기}'),
  (130.3, 135.0, '해석이 막히면?', '고민 X\n{오른쪽 해석}과 비교'), (155.8, 162.0, '③ 형광펜', '한글에서 중요한 부분\n→ {영어에도} 형광펜'),
  (195.6, 206.0, '시험 직전', '{형광펜·요약}만\n보면 끝'), (215.6, 222.7, '요약이 어렵다면', '{챗GPT}에게\n요약 맡기기'),
  (228.9, 233.6, '챗GPT 명령어', '한국어로 요약 +\n{중요 영어 어구} 집기'), (268.7, 277.9, '이것만 해도', '주제·순서·삽입\n{기본 변형} 해결'),
  (286.0, 292.5, '변형 문제 활용', '풀지 말고\n{내 자료에 표시}'), (300.3, 304.1, '중요 단어는?', '{문제가} 이미\n골라 줬다'),
  (320.1, 328.2, '정답·오답 포인트', '꺽쇠·{별표}로\n더 눈에 띄게'), (356.7, 363.0, '왜 변형 문제?', '중요한 판단은\n{전문가}에게'),
  (368.5, 375.3, '서술형 3종', '단어 채우기 · 어법 채우기\n{영작하기}'), (377.2, 386.9, '무엇을 외울까?', '선생님 강조\n{단어·문법·주제문}'),
  (391.1, 398.6, '암기 요령', '한 번에 X\n{덩어리}로 끊어서'), (428.4, 442.7, '한국어도', '끊어서 적고\n영어와 {매칭}')]
cards = [{'s': round(T(s), 3), 'e': round(T(e), 3), 'label': l, 'text': t} for s, e, l, t in CARDS]
# burned caption patches: union of detections within +-0.5s
cb = json.load(open('capbox2.json')); cc = json.load(open('capcol.json')); patches = []
for i, (t, x0, x1, y0, y1) in enumerate(cb):
    nb = [c for c in cb[max(0, i - 1):i + 2] if c[1] is not None]
    if not nb: continue
    nb = [c for c in cb[max(0, i - 2):i + 3] if c[1] is not None]
    p = [min(c[1] for c in nb) - 16, max(c[2] for c in nb) + 16]
    col = cc[i] or '#ffffff'
    if patches and patches[-1]['x'] == p and patches[-1]['c'] == col and abs(patches[-1]['se'] - t) < 0.01: patches[-1]['se'] = t + 0.5
    else: patches.append({'x': p, 'c': col, 'ss': t, 'se': t + 0.5})
patches = [{'s': round(T(p['ss']), 3), 'e': round(T(p['se']), 3), 'x0': p['x'][0], 'x1': p['x'][1], 'c': p['c']} for p in patches]
patches = [p for p in patches if p['e'] > p['s']]
json.dump({'dur': TOT, 'lines': out, 'states': states, 'chapters': chapters, 'cards': cards, 'patches': patches}, open('../motion/src/tip/rp9.json', 'w'), ensure_ascii=False)
ev = [['whoosh', c['s'] - 0.15] for c in chapters] + [['pop', c['s']] for c in cards] + [['tick', s['s']] for s in states[1:] if s['s'] not in [c['s'] for c in chapters]]
json.dump(sorted(ev, key=lambda x: x[1]), open('sfx_events.json', 'w'))
def ts(x): return f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
with open('../output/rp9_long.srt', 'w') as f:
    for n, l in enumerate(out): f.write(f"{n+1}\n{ts(l['s'])} --> {ts(l['e'])}\n{l['text'].replace('{','').replace('}','')}\n\n")
print('lines', len(out), 'patches', len(patches), 'dur', round(TOT, 2))
