"""rp9 long-form cut plan: keep speech, shrink pauses to <=0.3s, fast-forward long silent writing."""
import json, numpy as np
tr = json.load(open('tr.json')); db = np.load('db.npy'); dur = 494.74
words = [w for s in tr for w in s['w']]
sp = np.zeros(len(db), bool)
for s, e, _ in words: sp[int(max(0, s - 0.05) * 50):int((e + 0.05) * 50)] = True
sp &= db > -36
idx = np.flatnonzero(sp); segs = []
for k in idx:
    t = k / 50
    if segs and t - segs[-1][1] < 0.3: segs[-1][1] = t + 0.02
    else: segs.append([t, t + 0.02])
segs = [[max(0, s - 0.1), min(dur, e + 0.18)] for s, e in segs if e - s > 0.1]
plan, tot = [], 0
for j, (s, e) in enumerate(segs):
    if j:
        g0, g1 = segs[j - 1][1], s; gap = g1 - g0
        if gap > 0.3:
            sp_ = gap / 0.3 if gap < 2 else max(4.0, gap / 1.5)   # long writing pause: show it fast
            plan.append([g0, g1, sp_, 'gap']); tot += gap / sp_
        else: segs[j][0] = g0
    plan.append([segs[j][0], e, 1.0, 'talk']); tot += e - segs[j][0]
json.dump(plan, open('plan.json', 'w'))
print('pieces', len(plan), 'out', round(tot, 1))
