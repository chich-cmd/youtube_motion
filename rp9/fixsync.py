"""Exact A/V assembly: video pieces concatenated by frame count, audio rebuilt sample-exact from the source."""
import json, subprocess, numpy as np
plan = json.load(open('plan.json')); SR = 48000
nf = [int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f'pieces/p{n:03d}.mp4'],
      capture_output=True, text=True).stdout) for n in range(len(plan))]
with open('pieces/listv.txt', 'w') as f:
    for n, k in enumerate(nf): f.write(f"file 'p{n:03d}.mp4'\nduration {k/30:.6f}\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'pieces/listv.txt', '-an', '-c', 'copy', 'cutv.mp4'], check=True)
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'src/raw.mp4', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
out = []
for (s, e, sp, kind), k in zip(plan, nf):
    n = round(k / 30 * SR)
    if kind == 'talk':
        a = x[int(s * SR):int(s * SR) + n].copy()
        a = np.pad(a, (0, n - len(a)))
        r = min(len(a), int(0.015 * SR)); a[:r] *= np.linspace(0, 1, r); a[-r:] *= np.linspace(1, 0, r)
    else: a = np.zeros(n, np.float32)
    out.append(a)
y = np.concatenate(out)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', 'a_raw.wav'], input=y.tobytes(), check=True)
json.dump([k / 30 for k in nf], open('piece_durs.json', 'w'))
print('frames', sum(nf), 'video s', sum(nf) / 30, 'audio s', len(y) / SR)
