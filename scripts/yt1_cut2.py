"""Tight cut list for the yt1 word clip: speech (audio) + eyes-on-camera (gaze).
- speech frames are always kept (never cut a word), plus short pads before/after
- pauses are shrunk to at most MAXGAP, and only eyes-on-camera frames are kept in them
- glances away (script reading) inside pauses are removed
Usage: yt1_cut2.py <mono16k.f32> <gaze.json> <out.json>"""
import json, sys
import numpy as np
R = 0.02                                   # resolution (s)
PRE, POST, MAXGAP, MINKEEP = 0.12, 0.20, 0.22, 0.12
PROTECT = [(302.9, 308.0, 1.0)]            # analyzer demo: keep up to 1.0 s pause
a = np.fromfile(sys.argv[1], np.float32); SR = 16000; H = int(SR * R)
n = len(a) // H
db = 20 * np.log10(np.sqrt((a[:n * H].reshape(n, H) ** 2).mean(1)) + 1e-9)
db = np.convolve(db, np.ones(3) / 3, 'same')
speech = db > -37
q = db < -31; i = 0                        # long quiet stretches over room noise
while i < n:
    if q[i]:
        j = i
        while j < n and q[j]: j += 1
        if (j - i) * R >= 2.0: speech[i:j] = False
        i = j
    else: i += 1
# fill tiny holes inside words (< 0.12 s) so plosives/closures aren't treated as pauses
i = 0
while i < n:
    if not speech[i]:
        j = i
        while j < n and not speech[j]: j += 1
        if 0 < i and j < n and (j - i) * R < 0.12: speech[i:j] = True
        i = j
    else: i += 1
g = json.load(open(sys.argv[2]))
gt = np.array([x['t'] for x in g]); side = np.array([x['side'] or 0 for x in g])
side = np.array([np.median(side[max(0, k - 1):k + 2]) for k in range(len(side))])
away = np.interp(np.arange(n) * R, gt, (side > 0.6).astype(float)) > 0.5

keep = speech.copy()
pre, post = int(PRE / R), int(POST / R)
idx = np.where(speech)[0]
for k in idx:                               # pads around speech, but not on glance-away frames
    for m in range(max(0, k - pre), k):
        if not away[m]: keep[m] = True
    for m in range(k + 1, min(n, k + 1 + post)):
        if not away[m]: keep[m] = True
# shrink every remaining pause to <= MAXGAP of eyes-on-camera frames (taken right after the previous speech)
i = 0
while i < n:
    if not speech[i]:
        j = i
        while j < n and not speech[j]: j += 1
        s, e = i * R, j * R
        mx = MAXGAP
        for ps, pe, v in PROTECT:
            if s < pe and e > ps: mx = v
        budget = int(mx / R)
        kept = [m for m in range(i, j) if keep[m]]
        if len(kept) > budget:
            # keep the tail of the previous word and the lead-in of the next, drop the middle
            head = [m for m in kept if m < i + post][:budget // 2 + 1]
            tail = [m for m in kept if m >= j - pre][-(budget - len(head)):] if budget - len(head) > 0 else []
            for m in kept: keep[m] = False
            for m in head + tail: keep[m] = True
        if i > 0 and j < n and mx > MAXGAP:          # protected pause: keep eyes-on frames up to mx
            cand = [m for m in range(i, j) if not away[m]][:budget]
            for m in cand: keep[m] = True
        i = j
    else: i += 1
# drop kept fragments that are too short to read as video (unless speech)
i = 0
while i < n:
    if keep[i]:
        j = i
        while j < n and keep[j]: j += 1
        if (j - i) * R < MINKEEP and not speech[i:j].any(): keep[i:j] = False
        i = j
    else: i += 1
segs, i = [], 0
while i < n:
    if keep[i]:
        j = i
        while j < n and keep[j]: j += 1
        segs.append([round(i * R, 3), round(j * R, 3)]); i = j
    else: i += 1
# merge segments separated by < 0.06 s (avoid micro jump cuts)
mg = [segs[0]]
for s_, e_ in segs[1:]:
    if s_ - mg[-1][1] < 0.06: mg[-1][1] = e_
    else: mg.append([s_, e_])
dur = n * R
cuts, t = [], 0.0
for s_, e_ in mg:
    if s_ > t: cuts.append([round(t, 3), s_])
    t = e_
if t < dur: cuts.append([round(t, 3), round(dur, 3)])
total = sum(e_ - s_ for s_, e_ in mg)
spk_away = (away & speech).sum() * R
json.dump({'cuts': cuts, 'keep': mg, 'duration': round(total, 3)}, open(sys.argv[3], 'w'), indent=1)
print(f'{len(mg)} kept segments, {dur:.1f}s -> {total:.1f}s; glance-away while speaking (cannot cut): {spk_away:.1f}s')
