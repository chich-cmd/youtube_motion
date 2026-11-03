"""EP3 edit: trim silences, add chapter pauses, snap card timings to spoken words, remap everything,
and build the voice (DeepFilterNet-cleaned) + SFX tracks.

Run from /home/user/video-project:  .venv/bin/python ep3/build.py
Inputs : ep3/src/original.mp4, ep3/src/voice_df.wav (made by scripts/enhance_voice.py), ep3/scenes_src.json,
         ep3/transcript_raw.json
Outputs: motion/src/ep3/{scenes_cut,transcript}.json, ep3/voice_cut.f32, ep3/sfx.f32
"""
import json, re, subprocess, sys
import numpy as np
sys.path.insert(0, 'scripts')
from sfx import make_sfx

FPS, SR = 30, 48000
SRC, VOICE = 'ep3/src/original.mp4', 'ep3/src/voice_df.wav'
MIN_SIL, PAD_IN, PAD_OUT = 0.45, 0.10, 0.14
HOLD = 1.5                                         # silent beat on each chapter title card
CUT = (1e9, 1e9)                                   # nothing removed
SPEED = 1.0                                        # playback speed of the voice (pitch kept, rubberband)
snap = lambda t: round(t * FPS) / FPS

src = json.load(open('ep3/scenes_src.json'))
tr = json.load(open('ep3/transcript_raw.json'))
src['scenes'] = [sc for sc in src['scenes'] if not (CUT[0] <= sc['start'] < CUT[1])]
src['chapters'] = [c for c in src['chapters'] if not (CUT[0] <= c['start'] < CUT[1])]
tr = [s for s in tr if not (CUT[0] <= s['start'] < CUT[1])]
words = [w for s in tr for w in s['words']]

# 1. snap card times to the moment their keyword is spoken (within ±1.5 s of the planned time)
def snap_kw(o):
    if isinstance(o, dict):
        if 'kw' in o and 't' in o:
            hit = [w for w in words if o['kw'] in w['w'] and abs(w['s'] - o['t']) < 1.5]
            if hit: o['t'] = round(min(hit, key=lambda w: abs(w['s'] - o['t']))['s'], 2)
            del o['kw']
        for v in o.values(): snap_kw(v)
    elif isinstance(o, list):
        for v in o: snap_kw(v)
snap_kw(src)

# 2. silences → kept pieces, plus a pause at each chapter title (inside the real gap before its first words)
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', SRC, '-af', f'silencedetect=n=-38dB:d={MIN_SIL}', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)],
               [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC],
                           capture_output=True, text=True).stdout)
pieces, t = [], 0.0
for s, e in sil:
    a, b = (0.0 if s < 0.3 else snap(s + PAD_OUT)), snap(e - PAD_IN)
    if b - a < 2 / FPS: continue
    if a > t: pieces.append({'kind': 'src', 'a': t, 'b': a})
    t = b
last_word = max(w['e'] for w in words)
pieces.append({'kind': 'src', 'a': t, 'b': snap(min(dur, last_word + 1.5))})
pieces = [p for p in pieces if p['b'] > p['a']]

holds, inserts = {}, {}
for j, sc in enumerate(src['scenes']):
    ins = []                                       # silent card(s) shown right before this scene
    while j - len(ins) - 1 >= 0 and src['scenes'][j - len(ins) - 1].get('insert'): ins.insert(0, src['scenes'][j - len(ins) - 1])
    if sc.get('insert') or (sc['type'] != 'section' and not ins and not sc.get('pause')): continue
    if sc['start'] <= 0.01: hx = 0.0                # card before the very first scene
    else:
        k = min(range(1, len(words)), key=lambda i: abs(words[i]['s'] - sc['start']))
        gs, ge = words[k - 1]['e'], words[k]['s']
        inside = [(s, e) for s, e in sil if s <= ge and e >= gs]
        hx = snap((max(gs, inside[0][0]) + min(ge, inside[0][1])) / 2) if inside else snap((gs + ge) / 2)
    out = []
    for p in pieces:
        if p['kind'] == 'src' and p['a'] < hx < p['b']: out += [{**p, 'b': hx}, {**p, 'a': hx}]
        else: out.append(p)
    off = 0.0
    for c in ins:
        out.append({'kind': 'gap', 'a': hx, 'b': hx, 'gap': c['insert'] * SPEED}); inserts[id(c)] = (hx, off); off += c['insert']
    if sc['type'] == 'section': out.append({'kind': 'gap', 'a': hx, 'b': hx, 'gap': HOLD})
    if sc.get('pause'): out.append({'kind': 'gap', 'a': hx, 'b': hx, 'gap': sc['pause'] * SPEED})   # breathing room before this scene
    pieces = sorted(out, key=lambda p: (p['a'], p['kind'] != 'gap'))
    holds[id(sc)] = hx
cut = []
for p in pieces:
    if p['kind'] == 'gap' or p['b'] <= CUT[0] or p['a'] >= CUT[1]: cut.append(p); continue
    if p['a'] < CUT[0]: cut.append({**p, 'b': snap(CUT[0])})
    if p['b'] > CUT[1]: cut.append({**p, 'a': snap(CUT[1])})
pieces = cut
for p in pieces: p['dur'] = p['gap'] if p['kind'] == 'gap' else round(p['b'] - p['a'], 4)

def remap(x):
    acc = 0.0
    for p in pieces:
        if x < p['a'] or (p['kind'] == 'gap' and x == p['a']): return round(acc, 3)
        if x <= p['b'] and p['kind'] == 'src': return round(acc + x - p['a'], 3)
        acc += p['dur']
    return round(acc, 3)
_remap = remap
remap = lambda x: round(_remap(x) / SPEED, 3)
total = round(sum(p['dur'] for p in pieces) / SPEED, 3)

# 3. remap scenes / transcript
TK = {'start', 'end', 't', 'subAt', 'markAt', 'revealAt', 'until'}
def walk(o):
    if isinstance(o, dict): return {k: (remap(v) if k in TK and isinstance(v, (int, float)) else walk(v)) for k, v in o.items()}
    if isinstance(o, list): return [walk(v) for v in o]
    return o
scenes = []
for sc in src['scenes']:
    m = walk(sc)
    if id(sc) in inserts:
        m['start'] = round(remap(inserts[id(sc)][0]) + inserts[id(sc)][1], 3)
        for k, r in enumerate(m.get('rows', [])): r['t'] = round(m['start'] + 0.6 + 1.2 * k, 3)
    if id(sc) in holds:
        m['start'] = remap(holds[id(sc)])
        if sc.get('pause'):
            m['start'] = round(m['start'] + sc['pause'], 3)
            if 'clip' in m: m['clip']['from'] = holds[id(sc)]   # footage resumes where the voice does
        if scenes and scenes[-1].get('insert'): m['start'] = round(scenes[-1]['start'] + scenes[-1]['insert'], 3)
    scenes.append(m)
for i in range(len(scenes) - 1): scenes[i]['end'] = scenes[i + 1]['start']
scenes[0]['start'] = 0.0; scenes[-1]['end'] = total
for s in scenes:                                   # keep card times inside their scene
    for key in ('items', 'notes', 'days', 'parts', 'cards', 'rows', 'marks'):
        for it in s.get(key, []):
            if isinstance(it, dict): it['t'] = min(max(it['t'], s['start'] + 0.2), s['end'] - 0.3)
            if isinstance(it, dict) and 'until' in it: it['until'] = min(it['until'], s['end'] - 0.1)
chapters = [{'title': c['title'], 'start': next(s['start'] for s in scenes if s['type'] == 'section' and c['title'].startswith(s['index']))}
            for c in src['chapters']]
boxes = json.load(open('ep3/subboxes.json'))
for m in scenes:                                   # hide the burned-in subtitle box inside the source footage
    if m['type'] == 'clip':
        a0, a1 = m['clip']['from'], m['clip']['from'] + (m['end'] - m['start'])
        m['clip']['masks'] = [b for b in boxes if b['e'] > a0 and b['s'] < a1]
json.dump({'scenes': scenes, 'chapters': chapters, 'total': total}, open('motion/src/ep3/scenes_cut.json', 'w'), ensure_ascii=False, indent=1)
out = [{'start': remap(s['start']), 'end': remap(s['end']), 'text': s['text'],
        'words': [{'s': remap(w['s']), 'e': remap(w['e']), 'w': w['w']} for w in s['words']]} for s in tr]
json.dump(out, open('motion/src/ep3/transcript.json', 'w'), ensure_ascii=False, indent=1)
caps = [l.rstrip('\n').split('\t') for l in open('ep3/subs/subtitles.tsv', encoding='utf-8') if l.strip() and not l.startswith('#')]
caps += [l.rstrip('\n').split('\t') for l in open('ep3/captions_gaps.tsv', encoding='utf-8') if l.strip() and not l.startswith('#')]
FIX = [('샘이', '쌤이'), ('올려드릴께요', '올려드릴게요'), ('질투아니고', '질투 아니고'), ('지시사 ,연결사', '지시사, 연결사'), ('(B)에 ,3번', '(B)에, 3번'), ('  ', ' ')]
lines = []
for a_, b_, t_ in sorted(caps, key=lambda c: float(c[0])):
    for x, y in FIX: t_ = t_.replace(x, y)
    lines.append({'s': remap(float(a_)), 'e': remap(float(b_)), 'text': t_.strip()})
json.dump(lines, open('motion/src/ep3/captions.json', 'w'), ensure_ascii=False, indent=1)
print(f'pieces={len(pieces)} total={total:.1f}s (source {dur:.1f}s)')

# 4. voice + SFX
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VOICE, '-af', ','.join([
    'highpass=f=80', 'equalizer=f=300:t=q:w=1.2:g=-3', 'equalizer=f=3200:t=q:w=1.5:g=2',
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
if SPEED != 1:
    st = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', f'rubberband=tempo={SPEED}:pitchq=quality',
                         '-f', 'f32le', '-'], input=voice.tobytes(), capture_output=True, check=True).stdout
    voice = np.frombuffer(st, np.float32).reshape(-1, 2)
n = int(round(total * SR)); voice = np.concatenate([voice, np.zeros((max(0, n - len(voice)), 2), np.float32)])[:n]
voice.tofile('ep3/voice_cut.f32')
make_sfx(scenes, len(voice)).tofile('ep3/sfx.f32')
print('audio', round(len(voice) / SR, 2), 's')
