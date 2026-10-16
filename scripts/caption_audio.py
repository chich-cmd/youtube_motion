"""Mix original voice + cute SFX for a captioned upload. Usage: caption_audio.py <captions.json> <source.mp4> <out.wav>"""
import json, subprocess, sys, wave
import numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from sfx import SR, boom, bubble, click, ding, plink, whoosh

data = json.load(open(sys.argv[1]))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[2], '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
voice = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)
n = len(voice)
sfx = np.zeros(n)
S = dict(bubble=bubble(), click=click(), ding=ding(), plink=plink(), boom=boom(), whoosh=whoosh())
GAIN = dict(bubble=0.9, click=0.5, ding=0.6, plink=0.6, boom=0.55, whoosh=0.4)
def add(k, at):
    i = max(0, int(at * SR)); x = S[k][: max(0, n - i)]; sfx[i:i + len(x)] += GAIN[k] * x
for c in data['captions']:
    add('click', c['s'])
    if '**' in c['t']: add('plink', c['s'] + 3 / 30)
    if '[[' in c['t']: add('ding', c['s'] + 2 / 30)
    if c.get('emoji'): add('bubble', c.get('ea', c['s']))
    if 'zoom' in c: add('boom', c['zoom']); add('whoosh', c['zoom'] - 0.18)
# SFX sit ~8 dB under the voice peak
vpk = np.abs(voice).max(); spk = np.abs(sfx).max()
mix = voice + (sfx * (vpk * 0.4 / spk))[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.1) * 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mix ok', n / SR)
