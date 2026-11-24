"""Find long pauses in yt1_word audio and build a keep-list (pads keep breaths/word tails).
Usage: yt1_silence.py <mono16k.f32> <out.json>"""
import json, sys
import numpy as np
a = np.fromfile(sys.argv[1], np.float32); SR = 16000; H = 320  # 20 ms frames
n = len(a) // H
db = 20 * np.log10(np.sqrt((a[:n * H].reshape(n, H) ** 2).mean(1)) + 1e-9)
db = np.convolve(db, np.ones(3) / 3, 'same')
speech = db > -37
# long quiet stretches over room noise (< -31 dB for 2 s+) also count as pauses
q = db < -31; i = 0
while i < n:
    if q[i]:
        j = i
        while j < n and q[j]: j += 1
        if (j - i) * H / SR >= 2.0: speech[i:j] = False
        i = j
    else: i += 1
dur = n * H / SR
PRE, POST, MIN_GAP, KEEP = 0.25, 0.35, 0.75, 0.50   # seconds
# protected spans: (start, end, max pause allowed inside)
PROTECT = [(302.9, 308.0, 1.6)]   # analyzer "단어 하나 넣어볼게요" demo pause
cuts = []
i = 0
while i < n:
    if not speech[i]:
        j = i
        while j < n and not speech[j]: j += 1
        s, e = i * H / SR, j * H / SR
        if 0 < i and j < n and e - s >= MIN_GAP:
            keep = KEEP
            for ps, pe, mx in PROTECT:
                if s < pe and e > ps: keep = max(keep, mx)
            cs, ce = s + POST, e - PRE
            excess = (ce - cs) - (keep - PRE - POST)
            if excess > 0.15:
                cuts.append([round(cs, 3), round(cs + excess, 3)])
        i = j
    else:
        i += 1
keep = []; t = 0.0
for cs, ce in cuts:
    keep.append([round(t, 3), cs]); t = ce
keep.append([round(t, 3), round(dur, 3)])
removed = sum(ce - cs for cs, ce in cuts)
json.dump({'cuts': cuts, 'keep': keep}, open(sys.argv[2], 'w'), indent=1)
print(f'{len(cuts)} pauses trimmed, removed {removed:.1f}s of {dur:.1f}s -> {dur - removed:.1f}s')
for cs, ce in cuts: print(f'  {cs:7.2f}-{ce:7.2f} ({ce - cs:.2f}s)')
