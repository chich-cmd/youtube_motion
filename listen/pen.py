"""Pen strokes in the 11-15 cut: small local changes inside the crop, above the burned subtitle strip."""
import subprocess, numpy as np, json
W, H, FPS = 480, 270, 10
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', '../motion/public/listen.mp4', '-vf', f'fps={FPS},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
X0, X1, Y1 = 82, 433, 226          # crop x 330..1730, y < 905 (subtitles below)
rows = []
for i in range(1, len(fr)):
    d = np.abs(fr[i, :Y1, X0:X1] - fr[i - 1, :Y1, X0:X1]) > 30
    n = int(d.sum())
    if n > 0.03 * d.size: rows.append((i / FPS, 'scroll', n, None)); continue
    if n < 4: rows.append((i / FPS, 'idle', n, None)); continue
    ys, xs = np.nonzero(d); xs = xs + X0
    rows.append((i / FPS, 'pen', n, [int(np.median(xs)), int(np.median(ys)), int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())]))
json.dump(rows, open('pen_raw.json', 'w'))
