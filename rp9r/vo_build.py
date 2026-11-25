import json, re
vt = json.load(open('new/voice_tr.json'))
FIX = [('이그젠 뽀유나', 'EXAM4YOU나'), ('아인카', '아잉카'), ('직접 복습', '직전 복습')]
KEY = ['주목', '100점', '내용 숙지', '해석지', '한글 해석', '요약', '형광펜', '변형 문제', '표시', '중요 단어', '전문가', '정오답', '별표', '서술형', '영작', '덩어리', '첫 번째', '두 번째', '세 번째']
def clean(t):
    for a, b in FIX: t = t.replace(a, b)
    return re.sub(r'[.,]+(\s|$)', r'\1', t).strip()
MAXC = 16; lines = []
for seg in vt:
    ws = [[w[0], w[1], w[2].strip()] for w in seg['w']]
    for i, w in enumerate(ws):   # word-level fixes
        if w[2].startswith('이그젠') and i + 1 < len(ws): w[2] = 'EXAM4YOU나'; w[1] = ws[i + 1][1]; ws[i + 1][2] = ''
        if w[2].startswith('아인카'): w[2] = w[2].replace('아인카', '아잉카')
        if w[2] == '직접' and i + 1 < len(ws) and ws[i + 1][2].startswith('복습'): w[2] = '직전'
    ws = [w for w in ws if w[2]]
    chunks = [ws]
    while any(len(clean(' '.join(x[2] for x in c))) > MAXC and len(c) > 1 for c in chunks):
        nc = []
        for c in chunks:
            L = len(clean(' '.join(x[2] for x in c)))
            if L <= MAXC or len(c) < 2: nc.append(c); continue
            ks = [k for k in range(1, len(c)) if c[k - 1][2] not in ('변형', '중요', '한글', '내용')] or list(range(1, len(c))); k = min(ks, key=lambda k: abs(len(' '.join(x[2] for x in c[:k])) - L / 2)); nc += [c[:k], c[k:]]
        chunks = nc
    lines += chunks
out = []
for j, c in enumerate(lines):
    t = clean(' '.join(x[2] for x in c))
    for k in KEY:
        if k in t: t = t.replace(k, '{' + k + '}', 1); break
    nxt = lines[j + 1][0][0] if j + 1 < len(lines) else c[-1][1] + 0.5
    out.append({'s': round(c[0][0], 3), 'e': round(nxt if nxt - c[-1][1] < 0.6 else c[-1][1] + 0.3, 3), 'text': t})
# manual caption override (teacher's wording)
out = [l for l in out if not 63.9 < l['s'] < 69.7] + [{'s': 64.02, 'e': 65.94, 'text': '학교 선생님이 중요하다고 한'}, {'s': 65.94, 'e': 67.06, 'text': '단어, 문법이 담긴'}, {'s': 67.06, 'e': 69.74, 'text': '어구나 주제문을 암기하세요'}]
out = [l for l in out if l['s'] >= 2.0]   # opening title card replaces the first caption
out.sort(key=lambda l: l['s'])
TOT = 2201 / 30
W = [w for s in vt for w in s['w']]
def at(word, k=0): return [w[0] for w in W if word in w[2]][k]
st = [s['s'] for s in vt]
chips = [{'s': st[2], 'e': st[9] - 0.1, 'text': 'STEP 1 내용 숙지'}, {'s': st[9], 'e': st[18] - 0.1, 'text': 'STEP 2 변형 문제'}, {'s': st[18], 'e': TOT, 'text': 'STEP 3 서술형'}]
C = [('해석지', '해석 혼자 X', '{해석지} 끼고 시작'), ('요약', 'STEP 1', '{한글 해석} 먼저\n→ 요약'), ('형광펜', 'STEP 1', '영어에도\n{형광펜}'),
     ('마시고요', 'STEP 2', '풀지 말고\n{표시만}'), ('별표', '정답·오답 포인트', '{별표} ★'), ('영작하기', '서술형 3종', '단어 · 어법\n+ {영작}'), ('덩어리', '암기 요령', '{덩어리}로 끊어서')]
cards = [{'s': round(at(w), 2), 'e': round(at(w) + 1.6, 2), 'label': l, 'text': t} for w, l, t in C]
json.dump({'total': TOT, 'lines': out, 'chips': chips, 'cards': cards}, open('../motion/src/tip/rp9vo.json', 'w'), ensure_ascii=False)
ev = [['whoosh', c['s'] - 0.2] for c in chips] + [['ding' if '★' in c['text'] else 'pop', c['s']] for c in cards]
json.dump(sorted(ev, key=lambda x: x[1]), open('vo_sfx.json', 'w'))
def ts(x): return f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
with open('../output/rp9_reel.srt', 'w') as f:
    for n, l in enumerate(out): f.write(f"{n+1}\n{ts(l['s'])} --> {ts(l['e'])}\n{l['text'].replace('{','').replace('}','')}\n\n")
for l in out: print(f"{l['s']:6.2f} {l['text']}")
print(cards)
