"""Find pen/highlighter strokes: small, local frame-to-frame changes on the page (big changes = scrolling)."""
import subprocess, numpy as np, json
W, H, FPS = 360, 480, 10
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', '../motion/public/cut3.mp4', '-vf', f'fps={FPS},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
top = 62                               # skip status bar + toolbar
rows = []
for i in range(1, len(fr)):
    d = np.abs(fr[i, top:] - fr[i - 1, top:]) > 30
    n = int(d.sum())
    if n > 0.04 * d.size:                # scroll / zoom of the page
        rows.append((i / FPS, 'scroll', n, None)); continue
    if n < 6:
        rows.append((i / FPS, 'idle', n, None)); continue
    ys, xs = np.nonzero(d)
    rows.append((i / FPS, 'pen', n, [int(np.median(xs)), int(np.median(ys)) + top, int(xs.min()), int(xs.max()), int(ys.min()) + top, int(ys.max()) + top]))
json.dump(rows, open('pen_raw.json', 'w'))
for t, k, n, b in rows:
    if k != 'idle': print(f'{t:6.1f} {k:6s} {n:6d} {b}')
