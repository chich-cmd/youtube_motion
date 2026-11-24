"""Voice-over reel: new narration drives the timeline; each sentence gets a matching source scene, retimed to fit."""
import json, subprocess, os, re
from concurrent.futures import ThreadPoolExecutor
vt = json.load(open('new/voice_tr.json'))
END = vt[-1]['e'] + 0.5
# source scene per voice sentence (raw rp9 source seconds)
SRC = [(486.0, 492.0), (486.0, 492.0), (20.0, 27.0), (29.6, 32.6), (32.6, 35.5), (70.0, 80.0), (87.2, 94.5), (159.0, 168.0), (196.0, 200.2),
       (278.2, 281.6), (281.2, 287.8), (288.6, 292.5), (292.7, 295.3), (295.3, 299.8), (303.0, 314.0), (339.6, 343.0), (320.1, 328.2), (328.2, 334.9),
       (366.0, 368.2), (368.5, 375.3), (375.7, 386.9), (403.5, 413.5)]
assert len(SRC) == len(vt), (len(SRC), len(vt))
B = [0.0] + [s['s'] - 0.1 for s in vt[1:]] + [END]
B[2] = B[2]  # hook = sentences 0-1 share the summary page
fr = [round(b * 30) for b in B]
cb = json.load(open('../rp9/capbox2.json')); cc = json.load(open('../rp9/capcol.json'))
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
jobs = []
# hook: one continuous scene over sentences 0-1
segs = [(SRC[0][0], SRC[0][1], fr[0], fr[2])] + [(SRC[i][0], SRC[i][1], fr[i], fr[i + 1]) for i in range(2, len(SRC))]
os.makedirs('vpieces', exist_ok=True)
def job(a):
    n, (s, e, f0, f1) = a
    tgt = (f1 - f0) / 30
    sp = max((e - s) / tgt, 0.85)
    vf = ','.join(['setpts=PTS-STARTPTS'] + boxes(s, e) + [f'crop={X1-X0}:720:{(20 if n == 0 else X0)}:0', 'scale=2064:-2', f'pad=2064:2752:0:{PADTOP}:white',
                   f'setpts=PTS/{sp:.4f}', 'fps=30', f'tpad=stop_mode=clone:stop_duration={tgt:.3f}', 'format=yuv420p'])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{s:.3f}', '-t', f'{e-s:.3f}', '-i', '../rp9/src/raw.mp4', '-vf', vf, '-frames:v', str(f1 - f0), '-an',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', f'vpieces/p{n:03d}.mp4'], check=True)
    return n, round(sp, 2), round(tgt, 2)
import sys
ONLY = [int(x) for x in sys.argv[1:]]
with ThreadPoolExecutor(3) as ex: res = list(ex.map(job, [p for p in enumerate(segs) if not ONLY or p[0] in ONLY]))
print(res)
with open('vpieces/list.txt', 'w') as f:
    for n, (s, e, f0, f1) in enumerate(segs): f.write(f"file 'p{n:03d}.mp4'\nduration {(f1-f0)/30:.6f}\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'vpieces/list.txt', '-c', 'copy', 'vo_v.mp4'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'new/voice.m4a', '-t', f'{fr[-1]/30:.3f}', '-af', 'apad', '-ac', '1', '-ar', '48000', 'vo_raw.wav'], check=True)
print('frames', fr[-1])
