"""Reel timing: estimate narration length per chunk from motion/src/reel/script.json.

Writes motion/src/reel/timing.json (used by the Remotion composition and reel_audio.py)
and output/reel_cue_sheet.txt (recording guide). Tweak RATE to match your speaking pace.
"""
import json, re, sys
from pathlib import Path

RATE = 6.4          # spoken syllables per second (fast reel pace)
LEAD = 0.5          # silence before the first line
GAP = 0.3           # breath between chunks on the same sheet
SHEET_GAP = 0.55    # pause around a page flip
TAIL = 2.0          # hold on the last sheet

ROOT = Path(__file__).resolve().parent.parent
def dur(s):
    n = len(re.findall(r'[가-힣0-9]', s)) + 2 * s.count('~')
    pause = 0.15 * s.count(',') + 0.2 * len(re.findall(r'[.!?]', s))
    return n / RATE + pause

sheets, t = [], LEAD
for idx, sh in enumerate(json.load(open(ROOT / 'motion/src/reel/script.json'))):
    start, chunks = t, []
    for c in sh['vo']:
        d = dur(c); chunks.append({'text': c, 'start': round(t, 2), 'end': round(t + d, 2)}); t += d + GAP
    t += SHEET_GAP - GAP
    sheets.append({'id': idx, 'start': round(start, 2), 'chunks': chunks})
for i, s in enumerate(sheets):  # a page turns halfway through the pause before its first line
    s['flip'] = round(s['start'] - SHEET_GAP / 2, 2) if i else 0
total = round(t - SHEET_GAP + TAIL, 2)
json.dump({'total': total, 'sheets': sheets}, open(ROOT / 'motion/src/reel/timing.json', 'w'), ensure_ascii=False, indent=1)
fmt = lambda x: f"{int(x // 60)}:{x % 60:05.2f}"
lines = [f'# 릴스 녹음 가이드 (총 {total:.1f}초)', '# 아래 타이밍에 맞춰 읽으면 화면과 맞습니다. 종이가 넘어간 직후 다음 문장 시작.', '']
for i, s in enumerate(sheets):
    lines.append(f'── 컷 {i + 1} ──')
    lines += [f"[{fmt(c['start'])} – {fmt(c['end'])}] {c['text']}" for c in s['chunks']]
    lines.append('')
(ROOT / 'output').mkdir(exist_ok=True)
(ROOT / 'output/reel_cue_sheet.txt').write_text('\n'.join(lines))
print(f'total {total}s, {len(sheets)} sheets')
