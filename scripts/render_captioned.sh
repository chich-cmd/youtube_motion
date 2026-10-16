#!/usr/bin/env bash
# Usage: scripts/render_captioned.sh <source.mp4> <out.mp4>
# Captions/stickers/zooms come from motion/src/captioned/upload1.json; the source is pre-transcoded to motion/public/upload1.mp4.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=$1; OUT=$2; TMP=$(mktemp -d)
python3 scripts/caption_audio.py motion/src/captioned/upload1.json "$SRC" "$TMP/mix.wav"
(cd motion && npx remotion render src/index.ts Captioned "$TMP/video.mp4" --codec=h264 --crf=18 --muted --log=error 2>&1 \
  | grep -v -i -E "memory|docker|lower amount|webpack" || true)
ffmpeg -v error -y -i "$TMP/video.mp4" -i "$TMP/mix.wav" -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest "$OUT"
rm -rf "$TMP"; ls -la "$OUT"
