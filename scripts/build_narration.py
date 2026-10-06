"""Re-time the whole video to a newly recorded narration.

The reference timeline is the current edit (ref/: transcript, scenes, footage pieces). The new narration is
aligned to the reference script character-by-character, which gives a monotone map ref-time → narration-time.
Scenes, card items and SFX are moved through that map, lines missing from the recording are dropped, and the
original handwriting footage is re-timed (playbackRate) to follow the new pace.

Inputs : rec2/narration.mp3, rec2/transcript_raw.json, ref/{transcript,scenes,pieces}.json
Outputs: motion/src/data/{scenes_cut,transcript,pieces}.json, voice_cut.f32, sfx.f32, rec2/report.txt
"""
import difflib, json, re, subprocess, sys
import numpy as np
sys.path.insert(0, 'scripts')
from sfx import make_sfx

FPS, SR = 30, 48000
NAR = 'rec2/narration.mp3'
MIN_SIL, PAD_IN, PAD_OUT = 0.45, 0.10, 0.14
HOLD = {'01': 1.2, '02': 1.8, '03': 1.8}         # silent beat on each chapter title card
snap = lambda t: round(t * FPS) / FPS
norm = lambda t: re.sub(r'[^0-9A-Za-z가-힣]', '', t)

ref_tr = json.load(open('ref/transcript.json'))
ref = json.load(open('ref/scenes.json'))
ref_pieces = json.load(open('ref/pieces.json'))
new_tr = [s for s in json.load(open('rec2/transcript_raw.json')) if s['text'].strip()]

# ── 1. character-level alignment ref ↔ narration
def chars(segs):
    cs, ts = [], []
    for s in segs:
        for w in (s['words'] or [{'s': s['start'], 'e': s['end'], 'w': s['text']}]):
            c = norm(w['w'])
            for k, ch in enumerate(c):
                cs.append(ch); ts.append(w['s'] + (w['e'] - w['s']) * (k + 0.5) / len(c))
    return ''.join(cs), np.array(ts)
rc, rt = chars(ref_tr)
nc, nt = chars(new_tr)
sm = difflib.SequenceMatcher(None, rc, nc, autojunk=False)
matched = np.zeros(len(rc), bool)
A_ref, A_new = [], []
for b in sm.get_matching_blocks():
    if b.size < 2: continue
    matched[b.a:b.a + b.size] = True
    A_ref += list(rt[b.a:b.a + b.size]); A_new += list(nt[b.b:b.b + b.size])
A_ref, A_new = np.array(A_ref), np.array(A_new)
order = np.argsort(A_ref, kind='stable'); A_ref, A_new = A_ref[order], A_new[order]
keep = A_new >= np.maximum.accumulate(A_new)       # enforce monotone
A_ref, A_new = A_ref[keep], A_new[keep]
ref2nar = lambda t: float(np.interp(t, A_ref, A_new))
nar2ref = lambda t: float(np.interp(t, A_new, A_ref))
print(f'aligned {matched.mean():.0%} of reference characters')

# which reference lines were dropped from the recording
pos, dropped = 0, []
seg_cov = []
for s in ref_tr:
    n = sum(len(norm(w['w'])) for w in s['words']) or len(norm(s['text']))
    cov = matched[pos:pos + n].mean() if n else 1.0
    seg_cov.append((s['start'], s['end'], cov)); pos += n
    if cov < 0.4: dropped.append(s['text'])
def line_dropped(t):
    a, b, cov = min(seg_cov, key=lambda x: abs(x[0] - t))
    return abs(a - t) < 0.6 and cov < 0.4

# ── 2. narration silences → kept ranges (+ chapter holds)
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', NAR, '-af', f'silencedetect=n=-40dB:d={MIN_SIL}', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)],
               [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', NAR],
                           capture_output=True, text=True).stdout)
pieces = []
t = 0.0
for s, e in sil:
    a, b = (0.0 if s < 0.3 else snap(s + PAD_OUT)), snap(e - PAD_IN)
    if b - a < 2 / FPS: continue
    if a > t: pieces.append({'kind': 'src', 'a': t, 'b': a})
    t = b
end_speech = max(w['e'] for s in new_tr for w in s['words'])
pieces.append({'kind': 'src', 'a': t, 'b': snap(min(dur, end_speech + 1.2))})
pieces = [p for p in pieces if p['b'] > p['a']]

for sc in ref['scenes']:
    if sc['type'] != 'section': continue
    first = next(sg['start'] for sg in ref_tr if sg['end'] > sc['start'] + 0.5)
    x = ref2nar(first + 0.1)                       # first words of the chapter in the narration
    # pause point = the gap between the last word before the chapter and its first word
    nw = [w for sg in new_tr for w in sg['words']]
    k = min(range(1, len(nw)), key=lambda i: abs(nw[i]['s'] - x))
    gs, ge = nw[k - 1]['e'], nw[k]['s']
    inside = [(s, e) for s, e in sil if s <= ge and e >= gs]   # prefer a real silence in that gap
    hx = snap((max(gs, inside[0][0]) + min(ge, inside[0][1])) / 2) if inside else snap((gs + ge) / 2)
    out = []
    for p in pieces:
        if p['kind'] == 'src' and p['a'] < hx < p['b']: out += [{**p, 'b': hx}, {**p, 'a': hx}]
        else: out.append(p)
    out.append({'kind': 'gap', 'a': hx, 'b': hx, 'gap': HOLD.get(sc['index'], 1.5)})
    pieces = sorted(out, key=lambda p: (p['a'], p['kind'] != 'gap'))
    sc['_hold'] = hx
for p in pieces: p['dur'] = p['gap'] if p['kind'] == 'gap' else round(p['b'] - p['a'], 4)

def nar2fin(x):
    acc = 0.0
    for p in pieces:
        if x < p['a'] or (p['kind'] == 'gap' and x == p['a']): return round(acc, 3)
        if x <= p['b'] and p['kind'] == 'src': return round(acc + x - p['a'], 3)
        acc += p['dur']
    return round(acc, 3)
total = round(sum(p['dur'] for p in pieces), 3)
ref2fin = lambda t: nar2fin(ref2nar(t))

# ── 3. scenes
DROP_ITEMS = {'이게 제일 중요해요'}            # cards whose line was left out of the recording (checked by hand)
TK = {'start', 'end', 't', 'from', 'subAt', 'markAt'}
def walk(o):
    if isinstance(o, dict): return {k: (ref2fin(v) if k in TK and isinstance(v, (int, float)) else walk(v)) for k, v in o.items()}
    if isinstance(o, list): return [walk(v) for v in o]
    return o
scenes, removed_items = [], []
for sc in ref['scenes']:
    for key in ('items', 'notes', 'days'):
        if key in sc:
            keep_ = [it for it in sc[key] if (it.get('text') or it.get('day')) not in DROP_ITEMS]
            removed_items += [f"{sc.get('heading') or sc.get('title')}: {it.get('text') or it.get('day')}" for it in sc[key] if it not in keep_]
            sc = {**sc, key: keep_}
    hold = sc.pop('_hold', None)
    m = walk(sc)
    if hold is not None: m['start'] = nar2fin(hold) - 0.01   # title card appears as the pause begins
    scenes.append(m)
for i in range(len(scenes) - 1): scenes[i]['end'] = scenes[i + 1]['start']
scenes[-1]['end'] = total
kept = [s for s in scenes if s['end'] - s['start'] >= 0.8 or s['type'] == 'section']
removed_scenes = [s.get('heading') or s.get('title') or s['type'] for s in scenes if s not in kept]
for i in range(len(kept) - 1): kept[i]['end'] = kept[i + 1]['start']
kept[0]['start'] = 0.0; kept[-1]['end'] = total
for s in kept:                                     # keep item times inside their scene
    for key in ('items', 'notes', 'days'):
        for it in s.get(key, []): it['t'] = min(max(it['t'], s['start'] + 0.25), s['end'] - 0.3)
chapters = [{'title': c['title'], 'start': next(s['start'] for s in kept if s['type'] == 'section' and c['title'].startswith(s['index']))}
            for c in ref['chapters']]
json.dump({'scenes': kept, 'chapters': chapters, 'total': total}, open('motion/src/data/scenes_cut.json', 'w'), ensure_ascii=False, indent=1)

# ── 4. captions: what was actually said, spelled like the corrected script wherever it matches
def charinfo(segs):
    """Per normalised char: (char, time, starts_word, trailing_punct)."""
    out = []
    for sg in segs:
        for w in (sg['words'] or [{'s': sg['start'], 'e': sg['end'], 'w': sg['text']}]):
            c = norm(w['w']); punct = re.sub(r'.*?([,.?!~]*)$', r'\1', w['w'].strip())
            for k, ch in enumerate(c):
                out.append([ch, w['s'] + (w['e'] - w['s']) * (k + 0.5) / len(c), k == 0, punct if k == len(c) - 1 else ''])
    return out
RC, NC = charinfo(ref_tr), charinfo(new_tr)
def jamo(t):
    out = []
    for ch in t:
        c = ord(ch) - 0xAC00
        out += [chr(0x1100 + c // 588), chr(0x1161 + c % 588 // 28)] + ([chr(0x11A7 + c % 28)] if c % 28 else []) if 0 <= c < 11172 else [ch]
    return ''.join(out)
def sounds_alike(a, b):
    if re.search(r'\d', a + b): return True           # "이백오십" vs "250"
    if abs(len(a) - len(b)) > 1: return False
    return difflib.SequenceMatcher(None, jamo(a), jamo(b)).ratio() >= 0.36
# coalesce stray 1-2 char "equal" islands inside changed passages into the surrounding change
ops = [list(o) for o in difflib.SequenceMatcher(None, rc, nc, autojunk=False).get_opcodes()]
merged = []
for k, o in enumerate(ops):
    if o[0] == 'equal' and o[2] - o[1] < 3 and 0 < k < len(ops) - 1:
        o = ['replace'] + o[1:]
    if merged and o[0] != 'equal' and merged[-1][0] != 'equal':
        merged[-1] = ['replace', merged[-1][1], o[2], merged[-1][3], o[4]]
    else:
        merged.append(o)
stream, inserted = [], []
for op, i1, i2, j1, j2 in merged:
    if op == 'replace' and i2 == i1: op = 'insert'
    if op == 'replace' and j2 == j1: op = 'delete'
    if op == 'equal':
        stream += [[RC[i][0], NC[j][1], RC[i][2], RC[i][3]] for i, j in zip(range(i1, i2), range(j1, j2))]
    elif op == 'replace':
        rs, ns = rc[i1:i2], nc[j1:j2]
        whisper_slip = len(ns) <= 8 and len(rs) <= 8 and sounds_alike(rs, ns)
        if whisper_slip:                            # misheard → use the script's spelling, narration timing
            t0, t1 = NC[j1][1], NC[j2 - 1][1]
            stream += [[RC[i][0], t0 + (t1 - t0) * (k + 0.5) / (i2 - i1), RC[i][2], RC[i][3]] for k, i in enumerate(range(i1, i2))]
        else:
            stream += [list(NC[j]) for j in range(j1, j2)]
            inserted.append((NC[j1][1], ''.join(nc[j1:j2]), rc[i1:i2]))
    elif op == 'insert':
        stream += [list(NC[j]) for j in range(j1, j2)]
        if j2 - j1 >= 3: inserted.append((NC[j1][1], ''.join(nc[j1:j2]), ''))
# words from the char stream, cut into lines at the narration's own sentence boundaries
words = []
for ch, t, sw, pu in stream:
    if sw or not words: words.append({'w': ch, 's': t, 'e': t, 'p': pu})
    else: words[-1]['w'] += ch; words[-1]['e'] = t; words[-1]['p'] = pu or words[-1]['p']
for w in words: w['w'] += w.pop('p')
FINAL = re.compile(r'([.?!]|(니다|요|죠|겠네|구나|하느냐)[,]?)$')
bounds = [sg['end'] for sg in new_tr]
out, cur, bi = [], [], 0
for k, w in enumerate(words):
    while bi < len(bounds) - 1 and w['s'] > bounds[bi]:
        if cur: out.append(cur); cur = []
        bi += 1
    cur.append(w)
    if FINAL.search(w['w']) and len(norm(w['w'])) >= 2: out.append(cur); cur = []
if cur: out.append(cur)
# whisper slips the aligner cannot tell from real rewording (checked by hand)
CAPFIX = {'맛없는': '마더텅', '꽤틀고': '꿰뚫고', '꽤틀고있는': '꿰뚫고있는'}
for ws in out:
    for w in ws:
        core = re.sub(r'[,.?!~]+$', '', w['w'])
        if core in CAPFIX: w['w'] = CAPFIX[core] + w['w'][len(core):]
PHRASEFIX = [('꽤 틀고', '꿰뚫고'), ('Im looking', "I'm looking"), ('but 문장', 'But 문장')]
segs_out = []
for ws in out:
    fw = [{'s': nar2fin(w['s']) - 0.08, 'e': nar2fin(w['e']) + 0.08, 'w': w['w']} for w in ws]
    text = ' '.join(w['w'] for w in fw)
    fixed = text
    for a_, b_ in PHRASEFIX: fixed = fixed.replace(a_, b_)
    if fixed != text:                               # re-spread timing over the corrected words
        st, en, toks = fw[0]['s'], fw[-1]['e'], fixed.split()
        tot = sum(map(len, toks)); acc = 0; fw = []
        for tk in toks:
            a_ = st + (en - st) * acc / tot; acc += len(tk); fw.append({'s': a_, 'e': st + (en - st) * acc / tot, 'w': tk})
    segs_out.append({'start': fw[0]['s'], 'end': fw[-1]['e'], 'text': fixed, 'words': fw})
json.dump(segs_out, open('motion/src/data/transcript.json', 'w'), ensure_ascii=False, indent=1)
out = segs_out

# ── 5. footage: final time → original-video time, as short constant-rate chunks
def ref2orig(r):
    for p in ref_pieces:
        if p['at'] <= r <= p['at'] + p['dur']: return p['from'] + (r - p['at'])
    return None
fin_pieces, t = [], 0.0
fin2nar = []
for p in pieces:
    if p['kind'] == 'src': fin2nar.append((t, p['a'], p['dur']))
    t += p['dur']
def f2o(ft):
    for at, na, d in fin2nar:
        if at <= ft <= at + d: return ref2orig(nar2ref(na + ft - at))
    return None
FOOTAGE_LEAD = 0.4                                 # show the handwriting slightly before it is mentioned
fp = []
for sc in kept:                                    # re-sync at every spoken line, steady rate within it
    if sc['type'] != 'footage': continue
    st, en = sc['start'], sc['end']
    starts = {sg['start'] for sg in segs_out}
    cands = sorted({w['s'] for sg in segs_out for w in sg['words'] if st + 0.3 < w['s'] < en - 0.5})
    merged_a = [st]
    for t_ in cands:                               # every line start, plus a word start every ~1.2 s
        if t_ in starts and t_ - merged_a[-1] >= 0.6 or t_ - merged_a[-1] >= 1.2: merged_a.append(t_)
    merged_a.append(en)
    # cut points in the source (deleted lines etc.): f2o jumps → put a chunk boundary right there
    prev = None
    for k in range(int((en - st) / 0.05)):
        t_ = st + k * 0.05; o = f2o(t_)
        if o is not None and prev is not None and abs(o - prev[1] - (t_ - prev[0])) > 0.6: merged_a.append(t_)
        if o is not None: prev = (t_, o)
    merged_a = sorted(set(merged_a))
    merged_a = [x for i, x in enumerate(merged_a) if i == 0 or x - merged_a[i - 1] >= 0.25 or x == en]
    for t0, t1 in zip(merged_a, merged_a[1:]):
        o0 = next((f2o(t0 + k * 0.05) for k in range(20) if f2o(t0 + k * 0.05) is not None), None)
        o1 = next((f2o(t1 - k * 0.05) for k in range(20) if f2o(t1 - k * 0.05) is not None), None)
        if o0 is None: continue
        need = None if o1 is None or o1 <= o0 else (o1 - o0) / (t1 - t0)
        if need is None: rate = 1.0
        elif 0.4 <= need <= 2.5: rate = need
        else: rate, o0 = 1.0, o1 - (t1 - t0)       # too far apart (a cut in the source): jump, then play normally
        fp.append({'at': round(t0, 4), 'from': round(o0 + FOOTAGE_LEAD, 4), 'dur': round(t1 - t0, 4), 'rate': round(rate, 3)})
json.dump(fp, open('motion/src/data/pieces.json', 'w'))

# ── 6. audio
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', NAR, '-af', ','.join([
    'highpass=f=80', 'afftdn=nf=-30', 'agate=threshold=0.02:ratio=3:attack=5:release=120:range=0.25',
    'equalizer=f=300:t=q:w=1.2:g=-4', 'equalizer=f=3200:t=q:w=1.5:g=2',
    'acompressor=threshold=-22dB:ratio=3:attack=8:release=150:makeup=2']),
    '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.float32).reshape(-1, 2)
F = int(0.012 * SR); ramp = np.linspace(0, 1, F, dtype=np.float32)[:, None]
parts = []
for p in pieces:
    seg = np.zeros((int(round(p['dur'] * SR)), 2), np.float32) if p['kind'] == 'gap' else audio[int(round(p['a'] * SR)):int(round(p['b'] * SR))].copy()
    if p['kind'] == 'src' and len(seg) > 2 * F: seg[:F] *= ramp; seg[-F:] *= ramp[::-1]
    parts.append(seg)
voice = np.concatenate(parts)
voice.tofile('voice_cut.f32')
make_sfx(kept, len(voice)).tofile('sfx.f32')

rep = [f'total {total:.1f}s (narration {dur:.1f}s)', f'aligned {matched.mean():.0%}', '',
       '## 녹음에서 빠진 대본 줄', *dropped, '', '## 빠진 카드/요점', *removed_items, '', '## 빠진 장면', *removed_scenes, '',
       '## 대본과 다르게 말한 부분 (자막은 실제 말한 대로)', *[f'{nar2fin(t):6.1f}s  {n}' + (f'   (대본: {r})' if r else '') for t, n, r in inserted]]
open('rec2/report.txt', 'w').write('\n'.join(rep) + '\n')
print('\n'.join(rep))
