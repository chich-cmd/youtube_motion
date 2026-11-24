"""Map yt1 word-section scene times onto the pause-trimmed timeline and build a soft SFX track.
In:  yt1/yt1word_src.json (times on the untrimmed cut), yt1/silence_cuts.json
Out: motion/src/tip/yt1word.json, motion/public/yt1_sfx.wav"""
import json, sys, wave
import numpy as np
sys.path.insert(0, 'scripts')
from sfx import SR, whoosh, click, marker, plink, ding, tick

src = json.load(open('yt1/yt1word_src.json'))
cuts = json.load(open('yt1/silence_cuts.json'))['cuts']
def m(t):
    return round(t - sum(min(max(t - cs, 0), ce - cs) for cs, ce in cuts), 3)
out = {'video': 'yt1_word_tight.mp4', 'sfx': 'yt1_sfx.wav',
       'crops': [{**c, 's': m(c['s'])} for c in src['crops']],
       'scenes': [{'kind': s['kind'], 's': m(s['s']), 'at': [m(a) for a in s['at']]} for s in src['scenes']]}
json.dump(out, open('motion/src/tip/yt1word.json', 'w'), ensure_ascii=False, indent=1)

S = dict(whoosh=0.45 * whoosh(), click=0.8 * click(), marker=0.9 * marker(), plink=0.55 * plink(), ding=0.45 * ding(), tick=0.6 * tick())
ev = []
for i, sc in enumerate(out['scenes']):
    s, at, k = sc['s'], sc['at'], sc['kind']
    if i > 0: ev.append(('whoosh', s - 0.15))
    for a in at: ev.append(('click', a))
    H = {'chapter': lambda: [s + 1.2], 'pairs': lambda: [at[5] + 0.3], 'sentence': lambda: [at[0] + 0.6, at[2]],
         'address': lambda: [at[0] + 0.4], 'issue': lambda: [at[0] + 0.4], 'market': lambda: [at[1]],
         'mybook': lambda: [at[0], at[0] + 0.2, at[2], at[3]], 'plan': lambda: [s + 0.8, at[8] + 0.3, at[7] + 0.6],
         'worry': lambda: [s + 1.4], 'analyzer': lambda: [at[1] + 0.4], 'shift': lambda: [at[0] + 0.5]}
    hl = H[k]() if k in H else []
    ev += [('marker', a) for a in hl]
    if k == 'formula': ev.append(('plink', at[1]))
    if k == 'market': ev.append(('plink', at[2]))
    if k == 'address': ev.append(('ding', at[7]))
    if k == 'plan': ev.append(('ding', at[8]))
    if k == 'mybook': ev += [('tick', at[4] + j * 0.5) for j in range(5)]
    if k == 'analyzer': ev += [('tick', at[0] + j * 0.17) for j in range(7)]
    if k == 'shift': ev.append(('plink', at[0]))
dur = 247.9
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
