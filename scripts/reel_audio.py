"""SFX track for the reel → reel_sfx.wav. Events mirror the Remotion timing (timing.json + script.json)."""
import json, re, sys, wave
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from sfx import SR, ding, lp, swipe, tick, whoosh

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
rng = np.random.default_rng(3)

def bubble():  # emoji pop-in: quick downward blip
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = 1100 * np.exp(-t * 28) + 260
    return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045) * np.minimum(t / 0.002, 1)
def boing():  # expression change: springy pitch wobble
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 330 + 260 * (1 - np.exp(-t * 18)) + 70 * np.sin(2 * np.pi * 15 * t) * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.42 * (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / 0.13) * np.minimum(t / 0.004, 1)
def marker():  # highlighter stroke
    n = int(0.24 * SR); t = np.arange(n) / SR
    y = lp(rng.standard_normal(n), 5200) - lp(rng.standard_normal(n), 1800)
    flutter = 0.7 + 0.3 * np.sin(2 * np.pi * 38 * t)
    return 0.22 * y * flutter * np.sin(np.pi * t / t[-1]) ** 0.7 / (np.abs(y).max() + 1e-9)
def click():  # text line in
    return 1.3 * tick()

t = json.load(open(ROOT / 'motion/src/reel/timing.json'))
cuts = json.load(open(ROOT / 'motion/src/reel/script.json'))
n = int((t['total'] + 1) * SR)
track = np.zeros(n)
S = dict(bubble=bubble(), boing=boing(), marker=marker(), click=click(), ding=ding(), whoosh=whoosh(), swipe=swipe())
GAIN = dict(bubble=0.8, boing=0.75, marker=0.9, click=0.9, ding=0.55, whoosh=0.45, swipe=0.7)
OFF = dict(whoosh=-0.2)
def add(k, at):
    i = max(0, int((at + OFF.get(k, 0)) * SR)); x = S[k][: max(0, n - i)]; track[i:i + len(x)] += GAIN[k] * x

for i, (sh, cut) in enumerate(zip(t['sheets'], cuts)):
    base = round(sh['chunks'][0]['start'] * FPS)
    if i: add('whoosh', sh['flip'])
    add('bubble', base / FPS)
    add('boing', sh['swap'])
    seen = {}
    for ln in cut['lines']:
        k = ln.get('at', 0); seen[k] = seen.get(k, -1) + 1
        at = (round(sh['chunks'][k]['start'] * FPS) + 5 * seen[k]) / FPS
        add('click', at)
        if '**' in ln['t']: add('marker', at + 8 / FPS)
        if '~~' in ln['t']: add('swipe', at + 8 / FPS)
        if '[[' in ln['t'] and ln['size'] in ('xl', 'xxl'): add('ding', at + 0.05)

peak = np.abs(track).max()
track = np.tanh(track / max(peak, 1e-9) * 1.4) * 0.8  # soft limit
pcm = (np.repeat(track[:, None], 2, axis=1) * 32767).astype('<i2')
with wave.open(str(ROOT / 'reel_sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('sfx ok')
