"""rp9 -> 2-min reel: selected source ranges, tight pauses (long ones fast-forwarded to 0.25s)."""
import json
tr = json.load(open('../rp9/tr.json'))
W = [w for s in tr for w in s['w']]
R = [(0.0, 7.4), (23.0, 35.2), (51.1, 61.85), (152.1, 159.0), (195.6, 201.95), (204.05, 206.2),
     (278.2, 287.85), (288.7, 292.5), (292.7, 299.55), (300.2, 302.5), (320.1, 323.25), (324.6, 328.2),
     (359.4, 365.9), (366.0, 375.3), (375.7, 386.9), (391.1, 398.6), (488.8, 494.6)]
plan = []
for a, b in R:
    ws = [w for w in W if w[0] >= a - 0.05 and w[1] <= b + 0.1]
    segs = []
    for w in ws:   # merge words closer than 0.45s into one talk span
        if segs and w[0] - segs[-1][1] < 0.45: segs[-1][1] = w[1]
        else: segs.append([w[0], w[1]])
    segs = [[s - 0.08, e + 0.12] for s, e in segs]
    segs[0][0] = max(0, segs[0][0])
    for j, (s, e) in enumerate(segs):
        if j: plan.append([segs[j - 1][1], s, (s - segs[j - 1][1]) / 0.25, 'gap'])
        plan.append([s, e, 1.0, 'talk'])
json.dump(plan, open('plan.json', 'w'))
print(len(plan), round(sum((e - s) / sp for s, e, sp, k in plan), 1))
