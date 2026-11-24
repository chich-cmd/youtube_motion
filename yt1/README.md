# 유튜브 롱폼 1 — 단어 파트

- 소스(구글 드라이브 `유튜브1`): `SODA_817208103.mp4`(단어 본편), `SODA_817208336.mp4`(카드08 분석기)
- 소개 영상(`SODA_817202508`, `SODA_817203006`)은 작업 대상 아님
- 컷 편집: 08103 [0–169.40] + 08103 [179.30–298.50] (NG "…암기하여 컷" 제거, 끝 잡음 제거) + 08336 [0–46.20]
  → `motion/public/yt1_word.mp4` (loudnorm -14 LUFS)
- 렌더: 3구간 나눠 렌더 후 이어붙임 → `output/yt1_word.mp4` (`npx remotion render src/index.ts Yt1Word … --frames=0-3399` 등)
- 장면 타이밍: `motion/src/tip/yt1word.json`, 컴포넌트: `motion/src/tip/YTWord.tsx`
- 스타일: 3번 소프트 카드(연회색 배경 + 흰 카드 + 파랑 포인트), 얼굴 원 오른쪽 아래 + 검은 테두리, 자막 없음
- 단어장 예시: PDF 1903 perpetual (`motion/public/yt1/entry_perpetual.png`)
- 분석기 시연 화면은 임시(address) — 실제 화면 녹화 받으면 교체

## 무음 정리 + 효과음 (v3)
- `scripts/yt1_silence.py yt1/word.f32 yt1/silence_cuts.json` : -37dB 이하 0.75초 이상 쉼 → 0.5초로 줄임 (앞 0.25 / 뒤 0.35초 여유, 분석기 시연 구간은 1.6초 유지)
- 잘라낸 영상: `motion/public/yt1_word_tight.mp4` (334.7초 → 247.8초)
- `scripts/yt1_tight.py` : `yt1/yt1word_src.json`(원래 타이밍) → 새 타임라인으로 변환 + 효과음 트랙 `motion/public/yt1_sfx.wav`
- 형광펜(노랑=핵심, 파랑=뉘앙스, 빨강=틀린 것) + 밑줄(파랑)
