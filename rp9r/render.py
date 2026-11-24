"""Pieces at 2064x2752 (Annot reel source format): burned captions painted out, doc cropped & placed above the caption zone."""
import json, subprocess, os, numpy as np
from concurrent.futures import ThreadPoolExecutor
plan = json.load(open('plan.json'))
cb = json.load(open('../rp9/capbox2.json')); cc = json.load(open('../rp9/capcol.json'))
os.makedirs('pieces', exist_ok=True)
X0, X1, PADTOP = 170, 1110, 395
def boxes(s, e):
    out = []
    for i, (t, x0, x1, y0, y1) in enumerate(cb):
        if t + 0.5 < s - 0.5 or t > e + 0.5: continue
        nb = [c for c in cb[max(0, i - 2):i + 3] if c[1] is not None]
        if not nb: continue
        a, b = min(c[1] for c in nb) - 16, max(c[2] for c in nb) + 16
        col = (cc[i] or '#ffffff').replace('#', '0x')
        out.append(f"drawbox=x={a}:y=562:w={b-a}:h=122:color={col}:t=fill:enable='between(t,{max(0,t-s-0.25):.3f},{t-s+0.75:.3f})'")
    return out
def job(a):
    n, (s, e, sp, kind) = a
    d = (e - s) / sp
    still = e <= 9.05
    vin = ['-loop', '1', '-t', f'{e-s:.3f}', '-i', '../rp9/src/still6.png'] if still else ['-ss', f'{s:.3f}', '-t', f'{e-s:.3f}', '-i', '../rp9/src/raw.mp4']
    bx = boxes(s, e) if not still else [f"drawbox=x=291:y=562:w=697:h=122:color=white:t=fill"]
    vf = ','.join(['setpts=PTS-STARTPTS'] + bx + [f'crop={X1-X0}:720:{X0}:0', 'scale=2064:-2', f'pad=2064:2752:0:{PADTOP}:white', f'setpts=PTS/{sp}', 'fps=30', 'format=yuv420p'])
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + vin + ['-vf', vf, '-t', f'{d:.3f}', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', f'pieces/p{n:03d}.mp4'], check=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(job, enumerate(plan)))
nf = [int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f'pieces/p{n:03d}.mp4'], capture_output=True, text=True).stdout) for n in range(len(plan))]
with open('pieces/list.txt', 'w') as f:
    for n, k in enumerate(nf): f.write(f"file 'p{n:03d}.mp4'\nduration {k/30:.6f}\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'pieces/list.txt', '-c', 'copy', 'cutv.mp4'], check=True)
SR = 48000
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '../rp9/src/raw.mp4', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
out = []
for (s, e, sp, kind), k in zip(plan, nf):
    m = round(k / 30 * SR)
    if kind == 'talk':
        a = x[int(s * SR):int(s * SR) + m].copy(); a = np.pad(a, (0, m - len(a)))
        r = int(0.012 * SR); a[:r] *= np.linspace(0, 1, r); a[-r:] *= np.linspace(1, 0, r)
    else: a = np.zeros(m, np.float32)
    out.append(a)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', 'a_raw.wav'], input=np.concatenate(out).tobytes(), check=True)
json.dump([k / 30 for k in nf], open('piece_durs.json', 'w'))
print('frames', sum(nf), sum(nf) / 30)
