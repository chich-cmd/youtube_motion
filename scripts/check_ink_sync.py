"""For every handwriting stroke in the original, compare (in the new video) when the stroke appears vs when
the words the speaker said while drawing it are spoken in the new narration."""
import contextlib, io, json, re, sys
src = open('scripts/build_narration.py').read()
src = src[:src.index('# ── 3. scenes')]                 # alignment + timeline maps only (no file writes)
g = {}
with contextlib.redirect_stdout(io.StringIO()): exec(compile(src, 'build_narration', 'exec'), g)
ref2nar, nar2fin = g['ref2nar'], g['nar2fin']
ref_pieces = json.load(open('ref/pieces.json'))
fp = json.load(open('motion/src/data/pieces.json'))
words = [w for s in json.load(open('transcript_clean.json')) for w in s['words']]
caps = json.load(open('motion/src/data/captions.json'))

def orig2ref(o):
    for p in ref_pieces:
        if p['from'] <= o <= p['from'] + p['dur']: return p['at'] + o - p['from']
    return None
def appear_new(o):
    for c in fp:
        if c['from'] <= o <= c['from'] + c['dur'] * c['rate']: return c['at'] + (o - c['from']) / c['rate']
    return None
def cap_at(t):
    return next((c['text'] for c in caps if c['s'] <= t <= c['e'] + 0.3), '')

rows = []
for e in json.load(open('rec2/ink_events.json')):
    T = e['start'] + 0.2                              # stroke begins
    near = [w for w in words if w['s'] - 1.0 <= T <= w['e'] + 0.3]
    w = min(near, key=lambda w: abs(w['s'] - T)) if near else next((w for w in words if w['s'] > T), None)
    if w is None: continue
    r = orig2ref(w['s'])
    if r is None: continue                            # word was cut from the edit
    said = nar2fin(ref2nar(r))
    shown = appear_new(T)
    if shown is None: rows.append((None, T, w['w'], said, None, cap_at(said))); continue
    rows.append((round(shown - said, 2), T, w['w'], round(said, 2), round(shown, 2), cap_at(said)))
bad = [r for r in rows if r[0] is None or abs(r[0]) > 0.6]
print(f'{len(rows)} strokes checked, {len(rows) - len(bad)} within ±0.6 s')
for r in sorted(bad, key=lambda r: r[1]):
    off, T, word, said, shown, cap = r
    print(f'orig {T:6.1f}s  word "{word}"  said@{said}  stroke@{shown}  offset {off}  | {cap}')
json.dump(rows, open('rec2/ink_sync.json', 'w'), ensure_ascii=False)
