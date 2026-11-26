"""Concatenate v1..v6 voice clips: trim edges, shrink pauses >0.4s to 0.3s, sample-exact; output word times on the new timeline."""
import json, subprocess, numpy as np
SR = 48000; tr = json.load(open('tr.json'))
out, words, t0 = [], [], 0.0
for i in range(1, 7):
    k = f'v{i}'
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'src/{k}.m4a', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
    ws = [w for s in tr[k] for w in s['w']]
    segs = []
    for w in ws:
        if segs and w[0] - segs[-1][1] < 0.4: segs[-1][1] = w[1]
        else: segs.append([w[0], w[1]])
    segs = [[max(0, s - 0.08), min(len(x) / SR, e + 0.2)] for s, e in segs]
    for j, (s, e) in enumerate(segs):
        if j: out.append(np.zeros(int(0.3 * SR), np.float32)); t0 += 0.3
        a = x[int(s * SR):int(e * SR)].copy(); r = int(0.01 * SR); a[:r] *= np.linspace(0, 1, r); a[-r:] *= np.linspace(1, 0, r)
        for w in ws:
            if s - 0.01 <= w[0] <= e: words.append([round(t0 + w[0] - s, 3), round(t0 + w[1] - s, 3), w[2].strip(), k])
        out.append(a); t0 += len(a) / SR
    out.append(np.zeros(int(0.45 * SR), np.float32)); t0 += 0.45
y = np.concatenate(out)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', 'voice_raw.wav'], input=y.tobytes(), check=True)
json.dump(words, open('words.json', 'w'), ensure_ascii=False)
print('total', round(len(y) / SR, 2), 'words', len(words))
