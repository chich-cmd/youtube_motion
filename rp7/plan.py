"""Cut plan: keep speech (whisper words refined by loudness), shrink pauses, fast-forward long writing pauses."""
import json, subprocess, numpy as np, sys
SPEED = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
tr = json.load(open('tr.json'))
def env(i):
    a = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'src/v{i}.mp4', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(a, np.int16).astype(np.float32) / 32768
    n = len(x) // 320
    return 20 * np.log10(np.sqrt((x[:n * 320].reshape(n, 320) ** 2).mean(1)) + 1e-9), len(x) / 16000
plan, tot = [], 0
ORDER = [1, 2, 4, 5, 6]
MAXT = {5: 29.9}                      # drop the cut-off retake at the end of clip 10
for i in ORDER:
    db, dur = env(i)
    dur = min(dur, MAXT.get(i, dur) + 0.3)
    loud = db > -34
    words = [w for s in tr[str(i)] for w in s['w'] if w[0] < MAXT.get(i, 1e9) - 0.3]
    # speech frames = inside a word span and loud; merge gaps < 0.3s
    sp = np.zeros(len(db), bool)
    for s, e, _ in words: sp[int(max(0, s - 0.05) * 50):int((e + 0.05) * 50)] = True
    sp &= loud
    idx = np.flatnonzero(sp)
    segs = []
    for k in idx:
        t = k / 50
        if segs and t - segs[-1][1] < 0.3: segs[-1][1] = t + 0.02
        else: segs.append([t, t + 0.02])
    segs = [[max(0, s - 0.08), min(dur, e + 0.12)] for s, e in segs if e - s > 0.12]
    for j, (s, e) in enumerate(segs):
        if j:
            gap = s - segs[j - 1][1]
            if gap > 0.25:   # long pause: keep 0.25s of it, fast-forwarded so the writing still shows
                g0, g1 = segs[j - 1][1], s
                sp_ = max(1.0, gap / 0.25) if gap < 1.2 else max(4.0, gap / 1.4)
                plan.append([i, g0, g1, sp_, 'gap']); tot += gap / sp_
            else:
                segs[j][0] = segs[j - 1][1]
        plan.append([i, s, e, SPEED, 'talk']); tot += (e - s) / SPEED
json.dump(plan, open('plan.json', 'w'))
print('pieces', len(plan), 'output length', round(tot, 1))
