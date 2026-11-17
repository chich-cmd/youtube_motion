"""Cut 11-15 section: keep speech, shrink pauses (same method as cut3), speed SPEED."""
import json, subprocess, numpy as np
SPEED, A, B = 1.1, 539.8, 690.6
tr = json.load(open('tr.json'))
words = [w for s in tr for w in s['w'] if w[0] >= A - 0.2 and w[1] <= B + 0.3]
a = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(A), '-t', str(B - A), '-i', 'src/src.mp4', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(a, np.int16).astype(np.float32) / 32768
n = len(x) // 320
db = 20 * np.log10(np.sqrt((x[:n * 320].reshape(n, 320) ** 2).mean(1)) + 1e-9)
sp = np.zeros(n, bool)
for s, e, _ in words: sp[int(max(0, s - A - 0.05) * 50):int((e - A + 0.05) * 50)] = True
sp &= db > -36
segs = []
for k in np.flatnonzero(sp):
    t = k / 50
    if segs and t - segs[-1][1] < 0.3: segs[-1][1] = t + 0.02
    else: segs.append([t, t + 0.02])
segs = [[max(0, s - 0.08) + A, e + 0.12 + A] for s, e in segs if e - s > 0.12]
plan, tot = [], 0
for j, (s, e) in enumerate(segs):
    if j:
        gap = s - segs[j - 1][1]
        if gap > 0.25: plan.append([segs[j - 1][1], s, max(1.0, gap / 0.25), 'gap']); tot += 0.25
        else: s = segs[j - 1][1]; segs[j][0] = s
    plan.append([s, e, SPEED, 'talk']); tot += (e - s) / SPEED
json.dump(plan, open('plan.json', 'w'))
print(len(plan), round(tot, 1))
