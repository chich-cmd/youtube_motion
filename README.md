# youtube-motion

유튜브 롱폼 영상(수능 영어 공부법)을 모션그래픽 영상으로 다시 만드는 프로젝트입니다.

## 구조
- `scripts/transcribe_oa.py` : Whisper로 받아쓰기 (단어 타임스탬프)
- `scripts/clean_transcript.py` : 원본 자막 기준 오타 교정 → `transcript_clean.json`
- `scenes_src.json` : 장면 구성 (원본 영상 시간 기준) — **내용 수정은 여기서**
- `replacements.json` : 재녹음 문장 (원본 시간 구간 + 녹음 파일 경로)
- `scripts/build_cut.py` : 무음 제거 · 재녹음 삽입 · 타이밍 재계산 · 효과음 생성
- `scripts/render.sh` : 전체 빌드 + Remotion 렌더 + 오디오 합성
- `motion/` : Remotion(React) 모션그래픽 코드

## 다시 만들기
```bash
# 원본 영상을 src/original.mp4 에 두고
python3 -m venv .venv && .venv/bin/pip install openai-whisper numpy
(cd motion && npm i && cp node_modules/pretendard/dist/web/static/woff2/Pretendard-*.woff2 public/fonts/)
ffmpeg -i src/original.mp4 -an -c:v libx264 -crf 20 -pix_fmt yuv420p motion/public/original.mp4
scripts/render.sh final.mp4
```
