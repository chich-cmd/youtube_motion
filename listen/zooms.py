"""Pen events -> zoom shots in source px (1920x1080); z is relative to the reel's base crop."""
import json
rows = json.load(open('pen_raw.json')); lines = json.load(open('../motion/src/tip/listen_lines.json'))
cards = [(l['s'], l['e']) for l in lines if 'step' in l]
ev = []
for t, k, n, b in rows:
    if k == 'scroll':
        if ev: ev[-1]['closed'] = True
        continue
    if k != 'pen': continue
    if ev and not ev[-1].get('closed') and t - ev[-1]['e'] <= 0.8: ev[-1]['e'] = t; ev[-1]['pts'].append(b)
    else: ev.append({'s': t, 'e': t, 'pts': [b]})
shots = []
for e in ev:
    if len(e['pts']) < 4: continue
    s, end = e['s'] - 0.2, e['e'] + 1.0
    for a, b in cards:
        if s < b and end > a:
            if a - s > 1.0: end = a - 0.1
            elif end - b > 1.0: s = b + 0.1
            else: s = end
    if end - s < 1.0: continue
    x0 = min(p[2] for p in e['pts']) * 4; x1 = max(p[3] for p in e['pts']) * 4
    y0 = min(p[4] for p in e['pts']) * 4; y1 = max(p[5] for p in e['pts']) * 4
    z = max(1.2, min(1.45, 1340 / ((x1 - x0) * 1.5 + 1), 905 / ((y1 - y0) * 1.8 + 1)))
    shots.append({'s': round(s, 2), 'e': round(end, 2), 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'z': round(z, 2)})
m = []
for sh in shots:
    if m and sh['s'] - m[-1]['e'] < 1.2 and not any(m[-1]['e'] <= a <= sh['s'] for a, _ in cards):
        m[-1]['e'] = max(m[-1]['e'], sh['e']); m[-1].setdefault('then', []).append(sh)
    else: m.append(sh)
json.dump(m, open('../motion/src/tip/listen_zooms.json', 'w'), indent=0)
for x in m: print(x['s'], x['e'], x['z'], len(x.get('then', [])))
