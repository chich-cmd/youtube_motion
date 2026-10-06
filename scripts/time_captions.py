"""Time a hand-edited caption list (one line per caption) against the narration words.

Inputs : rec2/captions_user.txt, motion/src/data/transcript.json (narration words, final timeline)
Output : motion/src/data/captions.json  [{s, e, text}]
"""
import difflib, json, re

norm = lambda t: re.sub(r'[^0-9A-Za-z가-힣]', '', t)
lines = [l.strip() for l in open('rec2/captions_user.txt', encoding='utf-8') if l.strip()]
words = [w for sg in json.load(open('motion/src/data/transcript.json')) for w in sg['words']]

# narration chars with times
nc, nt = [], []
for w in words:
    c = norm(w['w'])
    for k, ch in enumerate(c):
        nc.append(ch); nt.append(w['s'] + (w['e'] - w['s']) * (k + 0.5) / len(c))
# caption chars tagged with their line
uc, ul = [], []
for i, l in enumerate(lines):
    for ch in norm(l): uc.append(ch); ul.append(i)

span = [[None, None] for _ in lines]
for b in difflib.SequenceMatcher(None, ''.join(uc), ''.join(nc), autojunk=False).get_matching_blocks():
    for k in range(b.size):
        i, t = ul[b.a + k], nt[b.b + k]
        span[i][0] = t if span[i][0] is None else min(span[i][0], t)
        span[i][1] = t if span[i][1] is None else max(span[i][1], t)
# lines with no match: place between neighbours
for i, (s, e) in enumerate(span):
    if s is None:
        prev = next((span[j][1] for j in range(i - 1, -1, -1) if span[j][1] is not None), 0.0)
        nxt = next((span[j][0] for j in range(i + 1, len(span)) if span[j][0] is not None), prev + 1.5)
        span[i] = [prev + 0.05, max(prev + 0.6, nxt - 0.05)]
        print('unmatched line:', lines[i])
out = []
for i, (l, (s, e)) in enumerate(zip(lines, span)):
    out.append({'s': round(s - 0.12, 3), 'e': round(e + 0.15, 3), 'text': l})
for a, b in zip(out, out[1:]):                       # no overlaps
    if a['e'] > b['s'] - 0.02: a['e'] = round(b['s'] - 0.02, 3)
json.dump(out, open('motion/src/data/captions.json', 'w'), ensure_ascii=False, indent=1)
bad = [(o['text'], round(o['e'] - o['s'], 2)) for o in out if o['e'] - o['s'] < 0.4]
print(len(out), 'captions; very short:', bad)
