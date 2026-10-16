"""Page-flip SFX track for the reel (timings from motion/src/reel/timing.json) → reel_sfx.wav."""
import json, sys, wave
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from sfx import SR, paper, whoosh

ROOT = Path(__file__).resolve().parent.parent
t = json.load(open(ROOT / 'motion/src/reel/timing.json'))
n = int((t['total'] + 1) * SR)
track = np.zeros(n)
flick, air = paper(), whoosh()
def add(x, at, gain):
    i = max(0, int(at * SR)); seg = x[: max(0, n - i)]; track[i:i + len(seg)] += gain * seg
for s in t['sheets'][1:]:
    start = s['flip'] - 10 / 30            # page turn starts 10 frames before the midpoint
    add(air, start - 0.05, 0.55)
    add(flick, start + 0.12, 1.0)
    add(flick[::-1] * 0.5, start + 0.3, 0.6)  # soft landing
track = np.clip(track, -1, 1)
pcm = (np.repeat(track[:, None], 2, axis=1) * 32767 * 0.9).astype('<i2')
with wave.open(str(ROOT / 'reel_sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', len(t['sheets']) - 1, 'flips')
