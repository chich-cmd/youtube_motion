import {staticFile} from 'remotion';

export const C = {
  bg: '#F5F3EE',
  card: '#FFFFFF',
  ink: '#15181E',
  sub: '#5B6270',
  line: '#E3E0D8',
  blue: '#2B63D9',
  blueSoft: '#E4ECFB',
  red: '#E0453A',
  redSoft: '#FCE6E3',
  yellow: '#FFE07A',
};

export const FONT = 'Pretendard';

const weights: [string, number][] = [
  ['Regular', 400], ['Medium', 500], ['SemiBold', 600], ['Bold', 700], ['ExtraBold', 800], ['Black', 900],
];

export const fontCss = weights
  .map(([n, w]) => `@font-face{font-family:'${FONT}';font-weight:${w};font-display:block;src:url('${staticFile(`fonts/Pretendard-${n}.woff2`)}') format('woff2');}`)
  .join('\n');

export const FPS = 30;
