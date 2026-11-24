"""Map yt1 word-section scene times onto the pause-trimmed timeline and build a soft SFX track.
In:  yt1/yt1word_src.json (times on the untrimmed cut), yt1/silence_cuts.json
Out: motion/src/tip/yt1word.json, motion/public/yt1_sfx.wav"""
import json, sys, wave
import numpy as np
sys.path.insert(0, 'scripts')
from sfx import SR, whoosh, click, plink, ding, tick, lp

def sha():  # short bright 'shak' highlighter swish
    n = int(0.17 * SR); t = np.arange(n) / SR
    x = np.random.default_rng(11).standard_normal(n)
    y = x - lp(x, 2500)                       # keep the hiss, drop the body
    e = np.minimum(t / 0.008, 1) * np.exp(-t / 0.045)
    sweep = 0.6 + 0.4 * np.minimum(t / 0.05, 1)
    y = y * e * sweep
    return 0.32 * y / (np.abs(y).max() + 1e-9)

src = json.load(open('yt1/yt1word_src.json'))
CUTS = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'yt1/cut2.json'))
cuts = CUTS['cuts']
def m(t):
    return round(t - sum(min(max(t - cs, 0), ce - cs) for cs, ce in cuts), 3)
out = {'video': CUTS.get('video', 'yt1_word_tight.mp4'), 'sfx': 'yt1_sfx.wav',
       'crops': [{**c, 's': m(c['s'])} for c in src['crops']],
       'scenes': [{'kind': s['kind'], 's': m(s['s']), 'at': [m(a) for a in s['at']]} for s in src['scenes']]}
json.dump(out, open('motion/src/tip/yt1word.json', 'w'), ensure_ascii=False, indent=1)

S = dict(whoosh=0.45 * whoosh(), click=0.8 * click(), marker=sha(), plink=0.55 * plink(), ding=0.45 * ding(), tick=0.6 * tick())
ev = []
for i, sc in enumerate(out['scenes']):
    s, at, k = sc['s'], sc['at'], sc['kind']
    if i > 0: ev.append(('whoosh', s - 0.15))
    for a in at: ev.append(('click', a))
    def tree(): return [s + 0.6] + [at[i] + 0.2 for i in (2, 4, 6) if i < len(at) and k == 'address' or (k == 'issue' and i in (2, 4))]
    H = {'chapter': lambda: [s + 0.8], 'pairs': lambda: [at[2], at[5] + 0.3], 'sentence': lambda: [at[0] + 0.6],
         'formula': lambda: [at[1] + 0.9], 'address': tree, 'issue': tree, 'market': lambda: [at[1]],
         'mybook': lambda: [s + 0.7, at[1] + 0.4, at[2] + 0.6, at[6] + 0.4],
         'plan': lambda: [s + 0.8, at[8] + 0.3], 'worry': lambda: [s + 1.4], 'analyzer': lambda: [at[1] + 0.4], 'next': lambda: [s + 0.7]}
    hl = H[k]() if k in H else []
    ev += [('marker', a) for a in hl]
    if k == 'formula': ev.append(('plink', at[1]))
    if k == 'market': ev.append(('plink', at[2]))
    if k == 'address': ev.append(('ding', at[7]))
    if k == 'plan': ev.append(('ding', at[8]))
    if k == 'mybook': ev += [('tick', at[4] + j * 0.5) for j in range(5)]
    if k == 'mybook': ev += [('whoosh', at[5]), ('plink', at[6])]
dur = CUTS.get('duration', 223.1)
n = int(dur * SR)
trk = np.zeros(n + SR)
for kk, a in ev:
    i0 = max(0, int(a * SR)); x = S[kk]
    trk[i0:i0 + len(x)] += x[:len(trk) - i0]
trk = np.clip(trk[:n] * 0.6, -1, 1)
pcm = (np.repeat(trk[:, None], 2, 1) * 32767).astype('<i2')
with wave.open('motion/public/yt1_sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(len(ev), 'sfx events; scenes:', [(s['kind'], s['s']) for s in out['scenes']])
