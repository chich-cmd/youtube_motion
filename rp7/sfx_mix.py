"""Mix synthesised SFX (scripts/sfx.py) at the event times into the voice track."""
import json, subprocess, sys, numpy as np
sys.path.insert(0, '../scripts')
from sfx import paper, tick, ding, whoosh, swipe, SR
src, dst = sys.argv[1], sys.argv[2]
v = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).copy()
S = {'pop': paper(), 'tick': tick() * 1.6, 'ding': ding(), 'whoosh': whoosh() * 0.8, 'swipe': swipe() * 0.9}
out = np.zeros(len(v) + SR, np.float32)
for k, t in json.load(open(sys.argv[3] if len(sys.argv) > 3 else 'sfx_events.json')):
    i = int(max(0, t) * SR); x = S[k]; out[i:i + len(x)] += x[:len(out) - i]
mix = v + 0.55 * out[:len(v)]
mix = mix / max(1.0, np.abs(mix).max() / 0.95)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', dst], input=mix.astype(np.float32).tobytes(), check=True)
