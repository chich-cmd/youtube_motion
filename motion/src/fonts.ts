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

// Korean display faces (Fontsource unicode-range subsets) used by on-screen effect captions.
export const DISPLAY = {serif: 'Nanum Myeongjo', hand: 'Nanum Pen Script', round: 'Jua', heavy: 'Black Han Sans'};
const DISPLAY_CSS: [string, string][] = [['nanum-myeongjo', '800.css'], ['nanum-pen-script', '400.css'], ['jua', '400.css'], ['black-han-sans', '400.css']];
if (typeof document !== 'undefined') {
  const handle = delayRender('display-fonts-css');
  Promise.all(DISPLAY_CSS.map(([dir, css]) => fetch(staticFile(`kfonts/${dir}/${css}`)).then((r) => r.text())
    .then((t) => t.split('./files/').join(staticFile(`kfonts/${dir}/files/`)))))
    .then((all) => { const st = document.createElement('style'); st.textContent = all.join('\n'); document.head.appendChild(st); continueRender(handle); })
    .catch(() => continueRender(handle));
}
