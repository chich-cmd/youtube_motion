import whisper, json, re, numpy as np
m = whisper.load_model("turbo"); new = json.load(open('../motion/src/tip/rp9.json'))['lines']
a = whisper.load_audio('a_ln.wav')
res = []
for t0, t1 in [(200, 260), (390, 481.8)]:
    r = m.transcribe(a[int(t0*16000):int(t1*16000)], language='ko', word_timestamps=True, condition_on_previous_text=False)
    W = [(w['start'] + t0, re.sub(r'[^\w]', '', w['word'])) for s in r['segments'] for w in s['words']]
    for l in new:
        if not (t0 + 1 < l['s'] < t1 - 1): continue
        tk = re.sub(r'[^\w]', '', l['text'].replace('{', '').split()[0])
        c = [ws for ws, t in W if t == tk and abs(ws - l['s']) < 4]
        if c: res.append(l['s'] - min(c, key=lambda x: abs(x - l['s'])))
o = np.abs(np.array(res)); print('n', len(o), 'pct50/90/max', np.percentile(o, [50, 90]).round(2), o.max().round(2), '>0.5s', (o > 0.5).sum())
print('ending:', [l['text'] for l in new[-3:]], new[-1]['e'])
