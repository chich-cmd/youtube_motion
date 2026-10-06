#!/usr/bin/env bash
# Usage: scripts/render.sh <out.mp4> [frame-range]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-final.mp4}; RANGE=${2:-}
.venv/bin/python scripts/build_cut.py
ffmpeg -v error -y -f f32le -ar 48000 -ac 2 -i voice_cut.f32 -f f32le -ar 48000 -ac 2 -i sfx.f32 \
  -filter_complex "[1]volume=0.35[s];[0][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[a]" -ar 48000 -c:a pcm_s16le mix.wav
(cd motion && npx remotion render src/index.ts Main ../video_silent.mp4 --codec=h264 --crf=20 --log=error ${RANGE:+--frames=$RANGE} 2>&1 \
  | grep -v -i -E "memory|docker|lower amount" || true)
ffmpeg -v error -y -i video_silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
# voice-free version (picture + SFX at the same level as in the full mix) and narration cue sheet
ffmpeg -v error -y -i video_silent.mp4 -f f32le -ar 48000 -ac 2 -i sfx.f32 -map 0:v -map 1:a -c:v copy \
  -af "volume=0.62,alimiter=limit=0.84" -c:a aac -b:a 192k -shortest "${OUT%.mp4}_no_voice.mp4"
python3 - "${OUT%.mp4}_script.txt" <<'PY'
import json, sys
fmt = lambda t: f"{int(t // 60)}:{t % 60:05.2f}"
tr = json.load(open('motion/src/data/transcript.json'))
open(sys.argv[1], 'w').write('# 녹음용 대본 (영상 타임코드 기준)\n\n' + '\n'.join(f"[{fmt(s['start'])} – {fmt(s['end'])}] {s['text']}" for s in tr) + '\n')
PY
ls -la "$OUT" "${OUT%.mp4}_no_voice.mp4" "${OUT%.mp4}_script.txt"
