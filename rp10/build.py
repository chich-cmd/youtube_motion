"""Timeline for the rp10 motion-graphic reel: captions + header/elements timed to the voice words."""
import json, re
W = json.load(open('words.json'))
import wave
_w = wave.open('voice_raw.wav'); TOT = round(_w.getnframes() / _w.getframerate(), 3)
FIX = {'문제제': '문제집', '끄는': '끊은', '복화': 'VOCA', '팔로우에': '팔로우해!'}
for w in W: w[2] = FIX.get(w[2], w[2])
def at(sub, clip, k=0):
    c = [w[0] for w in W if w[3] == clip and sub in w[2]]
    return round(c[k], 2)
def st(clip): return [w[0] for w in W if w[3] == clip][0]
# ---- captions: sentences -> balanced chunks <= 16 chars
KEY = ['1등급', '5배', '겨울방학', '불가능', '구조', '로즈리쌤', '그래머홀릭', '설명할', '반복해', '마스터', '느리면', '끊고', '덩어리마다', '앞에서부터', '주혜연쌤', '체크하자', '인스타랑', 'address', '다루다', '유의어', '뉘앙스', '한 단어장만', 'VOCA', '팔로우해!', '세 가지', '변형돼서']
sents, cur = [], []
for w in W:
    if cur and (w[3] != cur[-1][3] or w[0] - cur[-1][1] > 0.5): sents.append(cur); cur = []
    cur.append(w)
    if re.search(r'[.?!]$', w[2]) or w[2].endswith(','): sents.append(cur); cur = []
if cur: sents.append(cur)
MAXC = 16; lines = []
txt = lambda c: re.sub(r'[.,]+$', '', ' '.join(x[2] for x in c)).replace('.', '').replace(',', ',').strip()
for c0 in sents:
    chunks = [c0]
    while any(len(txt(c)) > MAXC and len(c) > 1 for c in chunks):
        nc = []
        for c in chunks:
            L = len(txt(c))
            if L <= MAXC or len(c) < 2: nc.append(c); continue
            i = min(range(1, len(c)), key=lambda i: abs(len(' '.join(x[2] for x in c[:i])) - L / 2)); nc += [c[:i], c[i:]]
        chunks = nc
    lines += chunks
# merge tiny neighbours
mg = []
for c in lines:
    if mg and c[0][3] == mg[-1][-1][3] and c[0][0] - mg[-1][-1][1] < 0.4 and len(txt(mg[-1] + c)) <= MAXC and not re.search(r'[.?!]$', mg[-1][-1][2]): mg[-1] = mg[-1] + c
    else: mg.append(c)
out = []
for j, c in enumerate(mg):
    t = re.sub(r'[.]', '', ' '.join(x[2] for x in c)).rstrip(',')
    for k in KEY:
        if k in t: t = t.replace(k, '{' + k + '}', 1); break
    nxt = mg[j + 1][0][0] if j + 1 < len(mg) else TOT
    out.append({'s': round(c[0][0], 3), 'e': round(nxt if nxt - c[-1][1] < 0.6 else c[-1][1] + 0.35, 3), 'text': t})
# captions: teacher's own line breaks (user_lines.txt) aligned to word times by character matching
import difflib
norm = lambda x: re.sub(r'[^0-9A-Za-z가-힣]', '', x)
W2 = [w for w in W if w[3] != 'v1']
cs, ci = '', []
for j, w in enumerate(W2):
    n = norm(w[2]); cs += n; ci += [j] * len(n)
UL = [l.strip() for l in open('user_lines.txt') if l.strip()]
us = ''.join(norm(l) for l in UL)
sm = difflib.SequenceMatcher(None, us, cs, autojunk=False)
m = {}
for blk in sm.get_matching_blocks():
    for k in range(blk.size): m[blk.a + k] = blk.b + k
starts, pos = [], 0
for l in UL:
    k = pos
    while k not in m and k < len(us): k += 1
    starts.append(W2[ci[m[k]]][0] if k in m else None); pos += len(norm(l))
out = [{'s': 0.0, 'e': st('v7'), 'text': '얘들아 중학 영어 A여도\n고등영어 {1등급} 안 나오는거 알아?'}]
for j, l in enumerate(UL):
    s0 = starts[j]; nxt = starts[j + 1] if j + 1 < len(UL) else TOT
    # end: last word of this line
    last = [w for w in W2 if s0 <= w[0] < nxt]
    e = nxt if last and nxt - last[-1][1] < 0.6 else (last[-1][1] + 0.35 if last else nxt)
    t = l
    for k in KEY:
        if k in t: t = t.replace(k, '{' + k + '}', 1); break
    out.append({'s': round(s0, 3), 'e': round(e, 3), 'text': t})
# ---- headers
v2, v8, v3, v4, v5, v6 = st('v7'), st('v8'), st('v3'), st('v4'), st('v5'), st('v6')
heads = [{'s': 0, 'head': '중학 영어 vs {고등} 영어'}, {'s': v2, 'head': '중학 공부 vs {고등} 공부'}, {'s': v3, 'step': '1', 'head': ''},
         {'s': v4, 'step': '2', 'head': ''}, {'s': v5, 'step': '3', 'head': ''}, {'s': v6, 'head': '앞으로 올라올 {꿀팁}'}]
E = []
def add(**k): E.append(k)
# hook
add(s=at('중학', 'v1'), e=v2, k='circle', x=290, y=720, r=170, text='중학\nA', c='red')
add(s=at('A여도', 'v1'), e=v2, k='text', x=0, y=675, text='vs', size=80, center=True)
add(s=at('고등', 'v1'), e=v2, k='circle', x=790, y=720, r=170, text='고등\n?등급', c='blue')
add(s=at('안', 'v1'), e=v2, k='text', x=820, y=470, text='ㅠㅠ', size=90, color='#2352E8')
# v7: middle vs high school study
add(s=at('교과서', 'v7'), e=v8, k='circle', x=290, y=700, r=170, text='교과서\n+ 문제집', c='red')
add(s=at('고등학생은', 'v7'), e=v8, k='text', x=0, y=655, text='vs', size=80, center=True)
add(s=at('시험', 'v7'), e=v8, k='circle', x=790, y=700, r=170, text='시험 범위\nx5', c='blue')
add(s=at('힘들거든', 'v7'), e=v8, k='tick', x=290, y=700, size=240, type='x')
# v8: promise
add(s=at('쌤이', 'v8'), e=v3, k='text', x=0, y=640, text='고등 {1등급}\n공부법 딱 정리!', size=96, center=True)
# v3 grammar
add(s=at('변형돼서', 'v3'), e=at('처음', 'v3'), k='text', x=0, y=560, text='내신 문법 = {지문 변형}', size=76, center=True)
add(s=at('처음', 'v3'), e=v4, k='card', x=70, y=430, w=940, size=46, text='The policy [that we approved] [will affect] residents.',
    marks=[{'s': at('구조를', 'v3'), 'text': '', 'label': '꾸밈 (관계절)', 'c': 'red'}, {'s': at('따질', 'v3'), 'text': '', 'label': '진짜 동사', 'c': 'blue'}])
add(s=at('로즈리쌤', 'v3'), e=v4, k='img', x=120, y=780, w=300, src='book_grammarholic.jpg', cap='EBS 로즈리 Grammar Holic')
add(s=at('설명할', 'v3'), e=v4, k='text', x=480, y=880, text='강의 없이\n{스스로 설명}할 수\n있을 때까지 반복', size=58)
add(s=at('마스터야', 'v3'), e=v4, k='tick', x=930, y=830, size=120, type='check')
# v4 reading
add(s=at('느리면', 'v4'), e=at('문장을', 'v4'), k='text', x=0, y=560, text='해석 느리면\n시간 {부족}', size=84, center=True)
add(s=at('문장을', 'v4'), e=at('또', 'v4'), k='card', x=70, y=430, w=940, size=46, text='[The policy] [that we approved] [will affect] residents.',
    marks=[{'s': at('끊고', 'v4'), 'text': '', 'label': '주어', 'c': 'blue'}, {'s': at('덩어리마다', 'v4'), 'text': '', 'label': '수식어절', 'c': 'red'}, {'s': at('앞에서부터', 'v4'), 'text': '', 'label': '진짜 동사', 'c': 'blue'}])
add(s=at('주혜연쌤', 'v4'), e=at('또', 'v4'), k='img', x=120, y=780, w=300, src='book_haeseok.jpg', cap='EBS 주혜연 해석공식')
add(s=at('패턴', 'v4'), e=at('또', 'v4'), k='text', x=480, y=900, text='패턴 익히고\n{혼자} 해석 체크', size=62)
add(s=at('또', 'v4'), e=v5, k='text', x=0, y=480, text='누보쌤 {해석 연습법} 업로드!', size=66, center=True)
add(s=at('또', 'v4'), e=v5, k='igcard', y=600, avatar='nouve_avatar.png', name='nou.ve', bio='누보 영어 과외\n수능영어·고등영어·노베이스 전문', stats=[['70', '게시물'], ['10만', '팔로워'], ['115', '팔로잉']])
# v5 vocab
add(s=at('address', 'v5'), e=at('영단어장으로', 'v5'), k='card', x=70, y=430, w=940, size=50, text='The mayor will [address] the problem.', marks=[{'s': at('다루다', 'v5'), 'text': '', 'label': '다루다', 'c': 'blue'}])
add(s=at('주소', 'v5'), e=at('영단어장으로', 'v5'), k='circle', x=300, y=1000, r=150, text='주소', c='red')
add(s=at('아니고', 'v5'), e=at('영단어장으로', 'v5'), k='tick', x=300, y=1000, size=230, type='x')
add(s=at('다루다', 'v5'), e=at('영단어장으로', 'v5'), k='circle', x=780, y=1000, r=150, text='다루다\n연설하다', c='blue')
add(s=at('연설하다야', 'v5'), e=at('영단어장으로', 'v5'), k='tick', x=925, y=830, size=130, type='check')
add(s=at('영단어장으로', 'v5'), e=at('유의어로', 'v5'), k='text', x=0, y=700, text='{고등 영단어장}으로\n새로 외우기', size=80, center=True)
add(s=at('한글', 'v5'), e=at('그리고', 'v5'), k='text', x=0, y=700, text='뜻 하나만 X\n{뉘앙스 + 유의어}', size=84, center=True)
add(s=at('한글', 'v5'), e=at('그리고', 'v5'), k='tick', x=850, y=700, size=110, type='x')
add(s=at('여러', 'v5'), e=at('쌤은', 'v5'), k='text', x=0, y=700, text='단어장은 {한 권}만\n1년 내내!', size=84, center=True)
add(s=at('쌤은', 'v5'), e=v6, k='img', x=390, y=560, w=300, src='book_ilman.jpg', cap='영일만 VOCA SUMMIT 2000')
add(s=at('강추할게', 'v5'), e=v6, k='tick', x=720, y=560, size=130, type='check')
# v6 outro: topics list, then follow-prompt card (earlier than the spoken '팔로우해')
FOL = at('누보쌤이', 'v6')
add(s=at('내신', 'v6'), e=FOL, k='text', x=0, y=560, text='내신 대비법', size=80, center=True)
add(s=at('수능', 'v6'), e=FOL, k='text', x=0, y=690, text='수능 독해', size=80, center=True)
add(s=at('문풀', 'v6'), e=FOL, k='text', x=0, y=820, text='문풀 꿀팁', size=80, center=True)
add(s=FOL, k='text', x=0, y=520, text='고등영어 준비는', size=72, center=True)
add(s=at('쌤', 'v6'), k='point', x=270, y=1585, v='ring', label='팔로우는 여기!')
add(s=FOL, k='follow', y=660, tap=at('싶으면', 'v6'), avatar='nouve_avatar.png', name='nou.ve', sub='수능영어·고등영어·노베이스 전문')
json.dump({'total': TOT, 'lines': out, 'heads': heads, 'els': E}, open('../motion/src/tip/rp10.json', 'w'), ensure_ascii=False)
ev = [['whoosh', h['s'] - 0.15] for h in heads[1:]] + [x for e in E if e['k'] == 'point' for x in (['whoosh', e['s'] - 0.1], ['ding', e['s'] + 0.35])] + [['pop' if e['k'] in ('circle', 'img', 'card') else ('tick' if e['k'] == 'tick' else 'pop'), e['s']] for e in E]
json.dump(sorted(ev, key=lambda x: x[1]), open('sfx.json', 'w'))
def ts(x): return f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
with open('../output/rp10_reel.srt', 'w') as f:
    for n, l in enumerate(out): f.write(f"{n+1}\n{ts(l['s'])} --> {ts(l['e'])}\n{l['text'].replace('{','').replace('}','')}\n\n")
for l in out: print(f"{l['s']:6.2f} {l['text']}")
