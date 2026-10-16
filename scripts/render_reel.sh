#!/usr/bin/env bash
# Usage: scripts/render_reel.sh [out.mp4]   — 9:16 page-flip reel (no voice; record narration to output/reel_cue_sheet.txt)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-output/reel.mp4}
python3 scripts/reel_timing.py
python3 scripts/reel_audio.py
(cd motion && npx remotion render src/index.ts Reel ../reel_silent.mp4 --codec=h264 --crf=18 --log=error 2>&1 \
  | grep -v -i -E "memory|docker|lower amount|webpack" || true)
ffmpeg -v error -y -i reel_silent.mp4 -i reel_sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
ls -la "$OUT" output/reel_cue_sheet.txt
