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
ls -la "$OUT"
