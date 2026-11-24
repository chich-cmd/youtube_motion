# 유튜브 롱폼 1 — 단어 파트

- 소스(구글 드라이브 `유튜브1`): `SODA_817208103.mp4`(단어 본편), `SODA_817208336.mp4`(카드08 분석기)
- 소개 영상(`SODA_817202508`, `SODA_817203006`)은 작업 대상 아님
- 컷 편집: 08103 [0–169.40] + 08103 [179.30–298.50] (NG "…암기하여 컷" 제거, 끝 잡음 제거) + 08336 [0–46.20]
  → `motion/public/yt1_word.mp4` (loudnorm -14 LUFS)
- 렌더: `cd motion && npx remotion render src/index.ts Yt1Word ../output/yt1_word_B.mp4`
- 장면 타이밍: `motion/src/tip/yt1word.json`, 컴포넌트: `motion/src/tip/YTWord.tsx`
- 스타일: B 노트형, 얼굴 원 오른쪽 아래 + 검은 테두리, 자막 없음
