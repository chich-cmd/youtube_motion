"""Even out voice timbre between recording takes: per-take spectral matching to the overall average (±6 dB, smoothed)."""
import subprocess, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
B = [float(v) for v in sys.argv[3].split(',')]          # take boundaries (s)
sr, N, H = 48000, 2048, 512
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).copy()
win = np.hanning(N)
nf = (len(x) - N) // H + 1
F = np.stack([np.fft.rfft(x[i * H:i * H + N] * win) for i in range(nf)])
mag = np.abs(F); e = (mag ** 2).sum(1)
fq = np.fft.rfftfreq(N, 1 / sr)
edges = np.geomspace(80, 12000, 25)
def ltas(rows):
    loud = rows[e[rows] > np.percentile(e[rows], 40)]
    m = (mag[loud] ** 2).mean(0)
    return np.array([m[(fq >= a) & (fq < b)].mean() for a, b in zip(edges[:-1], edges[1:])])
seg = [np.arange(int(a * sr / H), min(nf, int(b * sr / H))) for a, b in zip(B[:-1], B[1:])]
L = [ltas(s) for s in seg]
tgt = np.exp(np.mean([np.log(l) for l in L], 0))
centers = np.sqrt(edges[:-1] * edges[1:])
gains = []
for l in L:
    g = np.clip(10 * np.log10(tgt / l), -6, 6)
    g = np.convolve(np.pad(g, 1, mode='edge'), [0.25, 0.5, 0.25], 'valid')       # smooth across bands
    gains.append(10 ** (np.interp(np.log(np.maximum(fq, 1)), np.log(centers), g) / 20))
G = np.ones((nf, len(fq)))
fade = int(0.08 * sr / H)
for k, s in enumerate(seg):
    G[s] = gains[k]
    if k:                                   # short cross-fade between takes
        a = s[0]
        for j in range(-fade, fade):
            if 0 <= a + j < nf:
                w = (j + fade) / (2 * fade)
                G[a + j] = gains[k - 1] * (1 - w) + gains[k] * w
y = np.zeros(len(x)); wsum = np.zeros(len(x))
for i in range(nf):
    y[i * H:i * H + N] += np.fft.irfft(F[i] * G[i], N) * win
    wsum[i * H:i * H + N] += win ** 2
y = (y / np.maximum(wsum, 1e-6)).astype(np.float32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', dst], input=y.tobytes(), check=True)
for k, g in enumerate(gains): print(k, ' '.join(f'{20*np.log10(v):+.1f}' for v in np.interp(np.log([200, 500, 1000, 2000, 4000]), np.log(np.maximum(fq,1)), g)))
