import json, re, sys
sys.argv = ['x']
plan = json.load(open('plan.json')); ds = json.load(open('piece_durs.json')); tr = json.load(open('../rp9/tr.json'))
o = 0; M = []
for (s, e, sp, k), d in zip(plan, ds): M.append((s, e, o, d)); o += d
TOT = o
def T(t):
    for s, e, a, d in M:
        if s - 0.01 <= t <= e + 0.01: return a + min(max(t - s, 0), e - s) / (e - s) * d
    return None
src = open('../rp9/build.py').read()
exec(src[src.index('FIX = '):src.index('MAXC')])   # FIX, KEY
FIX = FIX + [('정우답', '정오답')]
def clean(t):
    for a, b in FIX: t = t.replace(a, b)
    return re.sub(r'[.,]+(\s|$)', r'\1', t).strip()
W = [[T(w[0]), T(w[1]), w[2].strip(), w[0]] for s in tr for w in s['w']]
W = [w for w in W if w[0] is not None and w[1] is not None]
# chunk per whisper segment (natural phrases), balanced split when too long
MAXC = 16; lines = []
for seg in tr:
    ws = [[T(w[0]), T(w[1]), w[2].strip()] for w in seg['w']]
    ws = [w for w in ws if w[0] is not None and w[1] is not None]
    if not ws: continue
    runs = [[ws[0]]]
    for w in ws[1:]:
        (runs[-1].append(w) if w[0] - runs[-1][-1][1] < 0.6 else runs.append([w]))
    for r in runs:
        chunks = [r]
        while any(len(clean(' '.join(x[2] for x in c))) > MAXC and len(c) > 1 for c in chunks):
            nc = []
            for c in chunks:
                L = len(clean(' '.join(x[2] for x in c)))
                if L <= MAXC or len(c) < 2: nc.append(c); continue
                i = min(range(1, len(c)), key=lambda i: abs(len(' '.join(x[2] for x in c[:i])) - L / 2)); nc += [c[:i], c[i:]]
            chunks = nc
        lines += chunks
mg = []
for c in lines:   # merge short neighbours into one line
    if mg and c[0][0] - mg[-1][-1][1] < 0.4 and len(clean(' '.join(x[2] for x in mg[-1] + c))) <= MAXC and not re.search(r'[.?!]$', mg[-1][-1][2]) and c[0][2] != '이게': mg[-1] = mg[-1] + c
    else: mg.append(c)
lines = mg
out = []
for j, c in enumerate(lines):
    t = clean(' '.join(x[2] for x in c))
    for k in KEY:
        if k in t: t = t.replace(k, '{' + k + '}', 1); break
    nxt = lines[j + 1][0][0] if j + 1 < len(lines) else c[-1][1] + 0.5
    out.append({'s': round(c[0][0], 3), 'e': round(min(nxt, c[-1][1] + 0.5) if nxt - c[-1][1] > 0.5 else nxt, 3), 'text': t})
def at(word, near):
    c = [w for w in W if word in w[2] and abs(w[3] - near) < 6]
    return min(c, key=lambda w: abs(w[3] - near))[0]
CH = [(at('1순위', 23.5), 'STEP 1 내용 숙지'), (at('2단계', 278.3), 'STEP 2 변형 문제'), (at('서술형', 366.8), 'STEP 3 서술형')]
chips = [{'s': round(s, 2), 'e': round(CH[i + 1][0] if i + 1 < len(CH) else T(398.5), 2), 'text': t} for i, (s, t) in enumerate(CH)]
CARDS = [('해설지', 34.0, '해석 혼자 X', '{해설지} 끼고 시작'), ('요약', 57.5, 'STEP 1', '{한글 해석} 먼저\n→ 요약'), ('형광펜', 158.5, 'STEP 1', '영어에도\n{형광펜}'),
         ('마시고요', 287.3, 'STEP 2', '풀지 말고\n{표시만}'), ('별표', 326.0, '정답·오답 포인트', '{별표} ★'),
         ('영작하기', 372.6, '서술형 3종', '단어 · 어법\n+ {영작}'), ('덩어리화', 397.2, '암기 요령', '{덩어리}로 끊어서')]
cards = []
for w, n, l, t in CARDS:
    s = at(w, n); cards.append({'s': round(s, 2), 'e': round(s + 1.7, 2), 'label': l, 'text': t})
json.dump({'total': TOT, 'lines': out, 'chips': chips, 'cards': cards, 'marks': [], 'cams': []}, open('../motion/src/tip/rp9r.json', 'w'), ensure_ascii=False)
ev = [['whoosh', c['s'] - 0.2] for c in chips] + [['ding' if '★' in c['text'] else 'pop', c['s']] for c in cards]
json.dump(sorted(ev, key=lambda x: x[1]), open('sfx_events.json', 'w'))
def ts(x): return f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
with open('../output/rp9_reel.srt', 'w') as f:
    for n, l in enumerate(out): f.write(f"{n+1}\n{ts(l['s'])} --> {ts(l['e'])}\n{l['text'].replace('{','').replace('}','')}\n\n")
for l in out: print(f"{l['s']:6.2f} {l['text']}")
print(cards); print(chips); print(TOT)
