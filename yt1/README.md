# 유튜브 롱폼 1 — 단어 파트

- 소스(구글 드라이브 `유튜브1`): `SODA_817208103.mp4`(단어 본편), `SODA_817208336.mp4`(카드08 분석기)
- 소개 영상(`SODA_817202508`, `SODA_817203006`)은 작업 대상 아님
- 컷 편집: 08103 [0–169.40] + 08103 [179.60–298.80] (NG "…암기하여 컷" 제거, 끝 잡음 제거) + 08336 [0–46.20]
  → `motion/public/yt1_word.mp4` (loudnorm -14 LUFS)
- 렌더: 3구간 나눠 렌더 후 이어붙임 → `output/yt1_word.mp4` (`npx remotion render src/index.ts Yt1Word … --frames=0-3399` 등)
- 장면 타이밍: `motion/src/tip/yt1word.json`, 컴포넌트: `motion/src/tip/YTWord.tsx`
- 스타일: A 체크리스트형(흰 모눈 + 검정 STEP 칩 + 노란 형광펜 + 파란 테두리 박스 + 초록 체크), 단어장 장면은 E형. 얼굴 원 320px 오른쪽 아래 + 검은 테두리, 자막 없음
- 단어장 예시: PDF 1903 perpetual (`motion/public/yt1/entry_perpetual.png`)
- 분석기 시연: 실제 GPT 화면 녹화(`motion/public/yt1/demo.mp4`, 대기 4배속 + 결과 1.5배속)

## 무음 정리 + 효과음 (v3)
- `scripts/yt1_silence.py yt1/word.f32 yt1/silence_cuts.json` : -37dB 이하(또는 -31dB 이하가 2초 이상) 0.75초 이상 쉼 → 0.5초로 줄임 (앞 0.25 / 뒤 0.35초 여유, 분석기 시연 구간은 1.6초 유지)
- 잘라낸 영상: `motion/public/yt1_word_tight.mp4` (334.7초 → 223.1초)
- `scripts/yt1_tight.py` : `yt1/yt1word_src.json`(원래 타이밍) → 새 타임라인으로 변환 + 효과음 트랙 `motion/public/yt1_sfx.wav`
- 형광펜(노랑=핵심, 파랑=뉘앙스, 빨강=틀린 것) + 밑줄(파랑)

## 섬세 컷 (v5)
- `scripts/yt1_gaze.py` : MediaPipe 얼굴 랜드마크로 프레임별 시선 점수 → `yt1/gaze.json` (side > 0.6 = 대본 쪽으로 눈 돌림)
- `scripts/yt1_cut2.py yt1/word.f32 yt1/gaze.json yt1/cut2.json` : 말소리는 절대 안 자름, 쉼은 최대 0.22초, 쉼 안의 눈 돌림 프레임 제거, 컷마다 6ms 오디오 페이드
- 334.7초 → 203.0초. 말하면서 눈 돌린 2.2초는 말을 잘라야 해서 유지
- `python3 scripts/yt1_tight.py yt1/cut2.json` 로 장면 타이밍/효과음 재계산
