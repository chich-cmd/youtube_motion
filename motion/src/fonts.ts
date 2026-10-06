import {continueRender, delayRender, staticFile} from 'remotion';
import {FONT} from './theme';

const weights: [string, string][] = [
  ['Regular', '400'], ['Medium', '500'], ['SemiBold', '600'], ['Bold', '700'], ['ExtraBold', '800'], ['Black', '900'],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    weights.map(([n, w]) =>
      new FontFace(FONT, `url(${staticFile(`fonts/Pretendard-${n}.woff2`)}) format('woff2')`, {weight: w})
        .load()
        .then((f) => document.fonts.add(f)),
    ),
  ).then(() => continueRender(handle));
}
