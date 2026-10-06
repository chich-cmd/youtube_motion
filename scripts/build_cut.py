"""Build the edited timeline: remove silences, splice in re-recorded lines, remap scene/transcript timings,
and render voice + SFX tracks.

Inputs : src/original.mp4, scenes_src.json, transcript_clean.json, replacements.json (file=null → keep original audio)
Outputs: motion/src/data/{scenes_cut,transcript,pieces}.json, voice_cut.f32, sfx.f32
"""
import json, re, subprocess
import numpy as np

FPS, SR = 30, 48000
SRC = 'src/original.mp4'
MIN_SIL, PAD_IN, PAD_OUT = 0.45, 0.10, 0.14   # cut gaps longer than MIN_SIL, leaving PAD_OUT after / PAD_IN before speech
END_KEEP = 623.0                              # keep the outro until here
snap = lambda t: round(t * FPS) / FPS

def ffaudio(path, extra=()):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *extra, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

# 1. silences → keep ranges in source time
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', SRC, '-af', 'silencedetect=n=-38dB:d=%s' % MIN_SIL, '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)],
               [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC],
                           capture_output=True, text=True).stdout)
cuts = []
for s, e in sil:
    a, b = (0.0 if s < 0.3 else snap(s + PAD_OUT)), snap(min(e - PAD_IN, END_KEEP))
    if a < END_KEEP and b - a >= 2 / FPS: cuts.append((a, b))
keeps, t = [], 0.0
for a, b in cuts:
    if a > t: keeps.append([t, a])
    t = b
keeps.append([t, snap(min(dur, END_KEEP + 1.5))])

# 2. splice re-recorded lines: remove [ra, rb] from keeps, insert a 'new' piece
reps = sorted([r for r in json.load(open('replacements.json')) if r.get('file')], key=lambda r: r['start'])
def widen(ra, rb):
    # extend to neighbouring silence so we never cut mid-word
    pre = [e for s, e in sil if ra - 0.6 <= e <= ra + 0.2]
    post = [s for s, e in sil if rb - 0.2 <= s <= rb + 0.8]
    return snap(min(pre) - PAD_IN if pre else ra - 0.05), snap(max(post) + 0.02 if post else rb + 0.05)
pieces = [{'kind': 'src', 'a': a, 'b': b} for a, b in keeps]
newaud = {}
ref_rms = None
spans = [list(widen(r['start'], r['end'])) for r in reps]
for i in range(len(spans) - 1):                 # adjacent lines (e.g. r4/r5) must not overlap
    if spans[i][1] > spans[i + 1][0]:
        spans[i][1] = spans[i + 1][0] = snap(reps[i + 1]['start'])
for r, (ra, rb) in zip(reps, spans):
    out = []
    for p in pieces:
        if p['kind'] != 'src' or p['b'] <= ra or p['a'] >= rb: out.append(p); continue
        if p['a'] < ra: out.append({**p, 'b': ra})
        if p['b'] > rb: out.append({**p, 'a': rb})
    # trim only leading/trailing silence, then tame room reverb and match the original's tone
    clip = ffaudio(r['file'], ['-af', ','.join([
        'highpass=f=80', 'afftdn=nf=-30',
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
        'areverse', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12', 'areverse',
        'agate=threshold=0.02:ratio=3:attack=5:release=120:range=0.25',   # shorten reverb tails between words
        'equalizer=f=300:t=q:w=1.2:g=-4', 'equalizer=f=3200:t=q:w=1.5:g=2',
        'acompressor=threshold=-22dB:ratio=3:attack=8:release=150:makeup=2'])])
    # shrink long pauses inside the recording the same way as the main edit
    w = int(0.02 * SR); lv = np.sqrt(np.convolve(clip[:, 0] ** 2, np.ones(w) / w, 'same'))
    quiet = lv < 10 ** (-40 / 20)
    keep = np.ones(len(clip), bool); i = 0
    while i < len(clip):
        if quiet[i]:
            j = i
            while j < len(clip) and quiet[j]: j += 1
            if (j - i) / SR > MIN_SIL: keep[i + int(PAD_OUT * SR):j - int(PAD_IN * SR)] = False
            i = j
        else: i += 1
    clip = clip[keep]
    pre = np.zeros((int(r.get('pre', 0.12) * SR), 2), np.float32)   # natural breath before the spliced line
    newaud[r['id']] = np.concatenate([pre, clip])
    out.append({'kind': 'new', 'id': r['id'], 'a': ra, 'b': rb, 'text': r['text']})
    pieces = sorted(out, key=lambda p: p['a'])
# 3. breathing room on chapter title cards (source time → seconds of silence)
HOLDS = {27.3: 1.2, 376.7: 1.8, 471.8: 1.8}
for x, d in HOLDS.items():
    out = []
    for p in pieces:
        if p['kind'] == 'src' and p['a'] < x < p['b']: out += [{**p, 'b': x}, {**p, 'a': x}]
        else: out.append(p)
    out.append({'kind': 'gap', 'a': x, 'b': x, 'gap': d})
    pieces = sorted(out, key=lambda p: (p['a'], p['kind'] != 'gap'))
for p in pieces:
    p['dur'] = {'src': lambda: round(p['b'] - p['a'], 4), 'gap': lambda: p['gap'],
                'new': lambda: len(newaud[p['id']]) / SR}[p['kind']]()

def remap(x):
    acc = 0.0
    for p in pieces:
        if x < p['a']: return round(acc, 3)
        if x <= p['b']: return round(acc + (x - p['a']) * p['dur'] / max(p['b'] - p['a'], 1e-6), 3)
        acc += p['dur']
    return round(acc, 3)
total = round(sum(p['dur'] for p in pieces), 3)
print(f'pieces={len(pieces)} replaced={len(reps)} total={total:.2f}s (src {dur:.1f}s)')

# 4. remap scenes, transcript; pieces for footage sync
src = json.load(open('scenes_src.json'))
TKEYS = {'start', 'end', 't', 'from', 'subAt', 'markAt'}
def walk(o):
    if isinstance(o, dict): return {k: (remap(v) if k in TKEYS and isinstance(v, (int, float)) else walk(v)) for k, v in o.items()}
    if isinstance(o, list): return [walk(v) for v in o]
    return o
scenes = walk(src['scenes']); scenes[-1]['end'] = total
chapters = [{**c, 'start': remap(c['start'])} for c in src['chapters']]
json.dump({'scenes': scenes, 'chapters': chapters, 'total': total}, open('motion/src/data/scenes_cut.json', 'w'), ensure_ascii=False, indent=1)

allreps = json.load(open('replacements.json'))
newspan, t = {}, 0.0
for p in pieces:
    if p['kind'] == 'new':
        pre = next((r.get('pre', 0.12) for r in reps if r['id'] == p['id']), 0)
        newspan[p['id']] = (round(t + pre, 3), round(t + p['dur'] - 0.05, 3))
    t += p['dur']
tr = json.load(open('transcript_clean.json'))
out, acc = [], 0.0
def prop_words(text, s, e):
    toks = text.split(); tot = sum(map(len, toks)); acc = 0; ws = []
    for tk in toks:
        a = s + (e - s) * acc / tot; acc += len(tk); ws.append({'s': round(a, 3), 'e': round(s + (e - s) * acc / tot, 3), 'w': tk})
    return ws
for seg in tr:
    r = next((r for r in allreps if r['start'] - 0.05 <= seg['start'] < r['end'] - 0.05), None)
    if r:
        if any(o.get('rid') == r['id'] for o in out): continue
        s, e = newspan.get(r['id'], (remap(r['start']), remap(r['end'])))
        out.append({'rid': r['id'], 'start': s, 'end': e, 'text': r['text'], 'words': prop_words(r['text'], s, e)})
        continue
    out.append({'start': remap(seg['start']), 'end': remap(seg['end']), 'text': seg['text'],
                'words': [{'s': remap(w['s']), 'e': remap(w['e']), 'w': w['w']} for w in seg['words']]})
json.dump(out, open('motion/src/data/transcript.json', 'w'), ensure_ascii=False, indent=1)
t = 0.0; fp = []
for p in pieces:
    if p['kind'] == 'src': fp.append({'at': round(t, 4), 'from': p['a'], 'dur': p['dur']})
    t += p['dur']
json.dump(fp, open('motion/src/data/pieces.json', 'w'))

# 5. voice track
audio = ffaudio(SRC, ['-af', 'afftdn=nf=-25'])
rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
F = int(0.012 * SR); ramp = np.linspace(0, 1, F, dtype=np.float32)[:, None]
parts = []
for p in pieces:
    if p['kind'] == 'src':
        seg = audio[int(round(p['a'] * SR)):int(round(p['b'] * SR))].copy()
    elif p['kind'] == 'gap':
        seg = np.zeros((int(round(p['dur'] * SR)), 2), np.float32)
    else:
        seg = newaud[p['id']].copy()
        ref = audio[int(max(0, p['a'] - 8) * SR):int((p['b'] + 8) * SR)]
        seg *= rms(ref[np.abs(ref).max(axis=1) > 0.02]) / rms(seg[np.abs(seg).max(axis=1) > 0.02])  # match loudness
    if len(seg) > 2 * F: seg[:F] *= ramp; seg[-F:] *= ramp[::-1]
    parts.append(seg)
voice = np.concatenate(parts).astype(np.float32)
voice.tofile('voice_cut.f32')

# 6. SFX (synthesised, no external assets)
rng = np.random.default_rng(7)
def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / max(attack, 1e-4), 1) * np.exp(-t / decay)
def lp(x, cut):
    a = np.exp(-2 * np.pi * np.asarray(cut) / SR) * np.ones_like(x)
    y, prev = np.empty_like(x), 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev; y[i] = prev
    return y
def paper():  # short paper-flick "삭"
    n = int(0.16 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sweep = 2200 + 4800 * np.minimum(t / 0.07, 1)
    y = lp(noise, np.minimum(sweep * 1.8, 11000)) - lp(noise, sweep * 0.55)
    grain = 0.75 + 0.25 * np.sign(np.sin(2 * np.pi * 70 * t + rng.uniform(0, 6)))  # fibrous texture
    e = np.minimum(t / 0.012, 1) * np.exp(-np.maximum(t - 0.03, 0) / 0.035)
    y = y * e * grain
    return 0.30 * y / (np.abs(y).max() + 1e-9)
def tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return 0.16 * np.sin(2 * np.pi * 2100 * t) * env(n, 0.001, 0.012)
def ding():
    n = int(1.1 * SR); t = np.arange(n) / SR
    x = sum(g * np.sin(2 * np.pi * 1046.5 * r * t) * np.exp(-t / d) for r, g, d in [(1, 1, .45), (2.0, .35, .25), (3.01, .18, .15), (4.16, .08, .1)])
    return 0.17 * x * np.minimum(t / 0.003, 1)
def whoosh():
    n = int(0.45 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n); shape = np.sin(np.pi * t / t[-1]) ** 2
    y = lp(noise, 300 + 3500 * shape) - lp(noise, 150 + 600 * shape)
    return 0.275 * y * shape / (np.abs(y).max() + 1e-9)
def swipe():
    n = int(0.28 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n); shape = np.sin(np.pi * t / t[-1])
    y = lp(noise, 1500 + 3000 * t / t[-1]) - lp(noise, 700)
    return 0.22 * y * shape / (np.abs(y).max() + 1e-9)
def boom():
    n = int(0.7 * SR); t = np.arange(n) / SR
    return 0.5 * np.sin(2 * np.pi * np.cumsum(95 * np.exp(-t * 3) + 45) / SR) * env(n, 0.004, 0.22)
S = {k: fn() for k, fn in dict(pop=paper, tick=tick, ding=ding, whoosh=whoosh, swipe=swipe, boom=boom).items()}
OFF = {'whoosh': -0.22}
events = []
for i, s in enumerate(scenes):
    st, k = s['start'], s['type']
    if i > 0: events.append(('whoosh', st))
    if k == 'section' or i == 0: events.append(('boom', st + 0.05))
    if k == 'stat': events.append(('ding', st + 0.15))
    for it in s.get('items', []) + s.get('days', []): events.append(('pop', max(it['t'], st + 0.25)))
    if s.get('foot'): events.append(('ding', s['foot']['t']))
    if k == 'quote': events.append(('swipe', s.get('markAt', st + 0.8)))
    for nt in s.get('notes', []): events.append(('ding' if nt.get('color') == 'red' else 'tick', max(nt['t'], st + 0.3)))
sfx = np.zeros(len(voice) + SR)
for k, at in events:
    i0 = max(0, int((at + OFF.get(k, 0)) * SR)); x = S[k]
    sfx[i0:i0 + len(x)] += x[:len(sfx) - i0]
np.repeat(sfx[:len(voice), None], 2, axis=1).astype(np.float32).tofile('sfx.f32')
print('sfx events', len(events))
