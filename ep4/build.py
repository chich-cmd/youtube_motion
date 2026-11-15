"""EP4: no cuts (output time = source time). Writes motion/src/ep4/{scenes_cut,captions}.json, mask boxes for the
burned-in subtitles inside the exam footage, and ep4/mix.wav (cleaned voice + SFX).
Run from the repo root: .venv/bin/python ep4/build.py"""
import json, subprocess, sys
import numpy as np
sys.path.insert(0, 'scripts')
from sfx import make_sfx
SRC, SR = 'ep4/src/original.mp4', 48000
src = json.load(open('ep4/scenes_src.json'))
sc = src['scenes']
total = round(float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC], capture_output=True, text=True).stdout), 3)
for i in range(len(sc) - 1): sc[i]['end'] = sc[i + 1]['start']
sc[-1]['end'] = total

caps = [l.rstrip('\n').split('\t') for l in open('ep4/map/subtitles.tsv', encoding='utf-8') if l.strip() and not l.startswith('#')]
lines = [{'s': float(a), 'e': float(b), 't': t.strip()} for a, b, t in caps]
json.dump([{'s': l['s'], 'e': l['e'], 'text': l['t']} for l in lines], open('motion/src/ep4/captions.json', 'w'), ensure_ascii=False, indent=0)
fx = json.load(open('motion/src/ep4/fx.json'))

def frame(t, x1):
    x1 = x1 // 2 * 2
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', SRC, '-frames:v', '1', '-vf', f'crop={x1}:220:0:860', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(220, x1).astype(int)

# Mask the subtitle/effect text that the original burned over the exam page: compare each frame's bottom band
# with a per-section median "clean plate" and box the large differences.
for s in sc:
    if s['type'] != 'clip': continue
    a, b, x1 = s['start'], s['end'], s['clip']['w'] // 2 * 2
    plate = np.median(np.stack([frame(t, x1) for t in np.linspace(a + 0.3, b - 0.3, 24)]), 0)
    events = [(l['s'], l['e']) for l in lines if l['e'] > a and l['s'] < b] + [(f['s'], f['e']) for f in fx if f['e'] > a and f['s'] < b and f['style'] != 'sfx' and f['style'] != 'bubble']
    masks = []
    for (e0, e1) in events:
        boxes = []
        for t in (max(a, e0) + 0.15, (max(a, e0) + min(b, e1)) / 2, min(b, e1) - 0.15):
            d = np.abs(frame(t, x1) - plate) > 60
            cols = np.where(d.sum(0) > 4)[0]; rows = np.where(d.sum(1) > 6)[0]
            if len(cols) > 30 and len(rows): boxes.append((cols.min(), cols.max(), rows.min() + 860, rows.max() + 860))
        if boxes:
            bx = np.array(boxes)
            masks.append({'s': round(max(a, e0) - 0.05, 2), 'e': round(min(b, e1) + 0.05, 2), 'x0': int(bx[:, 0].min()) - 12, 'x1': int(bx[:, 1].max()) + 12,
                          'y0': int(bx[:, 2].min()) - 10, 'y1': int(bx[:, 3].max()) + 10})
    s['clip']['masks'] = masks
    s['clip']['src'] = 'ep4_src.mp4'
    print(s['heading'], len(masks))
json.dump({'scenes': sc, 'chapters': src['chapters'], 'total': total}, open('motion/src/ep4/scenes_cut.json', 'w'), ensure_ascii=False, indent=1)
json.dump(json.load(open('ep4/transcript_raw.json')), open('motion/src/ep4/transcript.json', 'w'), ensure_ascii=False)

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'ep4/src/voice_df.wav', '-af', ','.join([
    'highpass=f=80', 'equalizer=f=300:t=q:w=1.2:g=-3', 'equalizer=f=3200:t=q:w=1.5:g=2', 'acompressor=threshold=-22dB:ratio=3:attack=8:release=150:makeup=2']),
    '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
voice = np.frombuffer(raw, np.float32).reshape(-1, 2)
n = int(round(total * SR)); voice = np.concatenate([voice, np.zeros((max(0, n - len(voice)), 2), np.float32)])[:n]
voice.tofile('ep4/voice.f32'); make_sfx(sc, n).tofile('ep4/sfx.f32')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'ep4/voice.f32', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'ep4/sfx.f32',
    '-filter_complex', '[0]loudnorm=I=-15:TP=-2:LRA=7,aresample=48000,asplit=2[v][key];[1]volume=0.75[s0];[s0][key]sidechaincompress=threshold=0.06:ratio=2:attack=10:release=200[s];[v][s]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89[a]',
    '-map', '[a]', '-ar', str(SR), '-c:a', 'pcm_s16le', 'ep4/mix.wav'], check=True)
print('total', total)
