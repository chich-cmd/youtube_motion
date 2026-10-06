"""Synthesised sound effects (no external assets) placed on scene events."""
import numpy as np

SR = 48000
rng = np.random.default_rng(7)
def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / max(attack, 1e-4), 1) * np.exp(-t / decay)
def lp(x, cut):
    a = np.exp(-2 * np.pi * np.asarray(cut) / SR) * np.ones_like(x)
    y, prev = np.empty_like(x), 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev; y[i] = prev
    return y
def paper():  # short paper-flick "삭"
    n = int(0.16 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sweep = 2200 + 4800 * np.minimum(t / 0.07, 1)
    y = lp(noise, np.minimum(sweep * 1.8, 11000)) - lp(noise, sweep * 0.55)
    grain = 0.75 + 0.25 * np.sign(np.sin(2 * np.pi * 70 * t + rng.uniform(0, 6)))  # fibrous texture
    e = np.minimum(t / 0.012, 1) * np.exp(-np.maximum(t - 0.03, 0) / 0.035)
    y = y * e * grain
    return 0.30 * y / (np.abs(y).max() + 1e-9)
def tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return 0.16 * np.sin(2 * np.pi * 2100 * t) * env(n, 0.001, 0.012)
def ding():
    n = int(1.1 * SR); t = np.arange(n) / SR
    x = sum(g * np.sin(2 * np.pi * 1046.5 * r * t) * np.exp(-t / d) for r, g, d in [(1, 1, .45), (2.0, .35, .25), (3.01, .18, .15), (4.16, .08, .1)])
    return 0.17 * x * np.minimum(t / 0.003, 1)
def whoosh():
    n = int(0.45 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n); shape = np.sin(np.pi * t / t[-1]) ** 2
    y = lp(noise, 300 + 3500 * shape) - lp(noise, 150 + 600 * shape)
    return 0.275 * y * shape / (np.abs(y).max() + 1e-9)
def swipe():
    n = int(0.28 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n); shape = np.sin(np.pi * t / t[-1])
    y = lp(noise, 1500 + 3000 * t / t[-1]) - lp(noise, 700)
    return 0.22 * y * shape / (np.abs(y).max() + 1e-9)
def boom():
    n = int(0.7 * SR); t = np.arange(n) / SR
    return 0.5 * np.sin(2 * np.pi * np.cumsum(95 * np.exp(-t * 3) + 45) / SR) * env(n, 0.004, 0.22)
def make_sfx(scenes, n):
    """Return an (n, 2) float32 SFX track for the given scene list."""
    S = {k: fn() for k, fn in dict(pop=paper, tick=tick, ding=ding, whoosh=whoosh, swipe=swipe, boom=boom).items()}
    OFF = {'whoosh': -0.22}
    events = []
    for i, s in enumerate(scenes):
        st, k = s['start'], s['type']
        if i > 0: events.append(('whoosh', st))
        if k == 'section' or i == 0: events.append(('boom', st + 0.05))
        if k == 'stat': events.append(('ding', st + 0.15))
        for it in s.get('items', []) + s.get('days', []): events.append(('pop', max(it['t'], st + 0.25)))
        if s.get('foot'): events.append(('ding', s['foot']['t']))
        if k == 'quote': events.append(('swipe', s.get('markAt', st + 0.8)))
        for nt in s.get('notes', []): events.append(('ding' if nt.get('color') == 'red' else 'tick', max(nt['t'], st + 0.3)))
    sfx = np.zeros(n + SR)
    for k, at in events:
        i0 = max(0, int((at + OFF.get(k, 0)) * SR)); x = S[k]
        sfx[i0:i0 + len(x)] += x[:len(sfx) - i0]
    return np.repeat(sfx[:n, None], 2, axis=1).astype(np.float32)
