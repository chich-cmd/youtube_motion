import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import '../fonts';
import {FONT, FPS} from '../theme';
import timing from './timing.json';
import script from './script.json';
import {Cut, Sheet as Content} from './Sheet';
import {R} from './ui';

export const REEL_TOTAL = timing.total;
const sheets = timing.sheets;
const N = sheets.length;

const W = 940, H = 1320, LEFT = (1080 - W) / 2, TOP = 255;
const FLIP = 20; // frames per page turn
const fr = (s: number) => Math.round(s * FPS);
const flipStart = (i: number) => fr(sheets[i].flip) - FLIP / 2;

const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.45 0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0.07 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const paperBg: React.CSSProperties = {
  background: R.paper, backgroundImage: grain, borderRadius: 18,
};

const Holes: React.FC = () => (
  <div style={{position: 'absolute', top: 30, left: 70, right: 70, display: 'flex', justifyContent: 'space-between'}}>
    {Array.from({length: 13}, (_, i) => (
      <div key={i} style={{width: 26, height: 26, borderRadius: 13, background: '#2A3350', boxShadow: 'inset 0 3px 4px rgba(0,0,0,0.5)'}} />
    ))}
  </div>
);

const Rings: React.FC<{inside?: boolean}> = ({inside}) => (
  <div style={{position: 'absolute', top: (inside ? 0 : TOP) - 34, left: (inside ? 0 : LEFT) + 70, width: W - 140, display: 'flex', justifyContent: 'space-between'}}>
    {Array.from({length: 13}, (_, i) => (
      <div key={i} style={{
        width: 26, height: 82, borderRadius: 13, border: '7px solid #9AA0AD', borderBottomColor: 'transparent',
        background: 'transparent', boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
        borderTopColor: '#E3E6EC', borderLeftColor: '#BFC4CE', borderRightColor: '#7F8594',
      }} />
    ))}
  </div>
);

/** One sheet of paper with its content; `f` is the global frame. */
const Sheet: React.FC<{i: number; f: number}> = ({i, f}) => {
  const s = sheets[i];
  const base = fr(s.chunks[0].start);
  const c = s.chunks.map((x) => fr(x.start) - base);
  return (
    <div style={{position: 'absolute', inset: 0, ...paperBg, overflow: 'hidden'}}>
      <Holes />
      <div style={{position: 'absolute', left: 0, right: 0, top: 78, height: 3, background: '#EBE6DA'}} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 120, bottom: 100, color: R.ink, fontFamily: FONT, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <Content cut={(script as Cut[])[i]} f={f - base} c={c} />
      </div>
      <div style={{position: 'absolute', right: 56, bottom: 40, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: R.faint, letterSpacing: 1}}>
        {i + 1} / {N}
      </div>
    </div>
  );
};

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  // `under` = newest sheet that has started appearing; while its turn is running, the previous sheet is mid-flip on top.
  let under = 0;
  for (let i = 1; i < N; i++) if (f >= flipStart(i)) under = i;
  const p = under > 0 ? interpolate(f, [flipStart(under), flipStart(under) + FLIP], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0.05, 0.4, 1),
  }) : 1;
  const flipping = under > 0 && p < 1;
  const ang = p * 180;
  const rad = (ang * Math.PI) / 180;
  const remaining = N - 1 - under;

  return (
    <AbsoluteFill style={{background: 'radial-gradient(120% 80% at 50% 35%, #34446E 0%, #1E2742 70%, #161C30 100%)', fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', color: '#fff', fontSize: 44, fontWeight: 800, letterSpacing: -0.5, opacity: 0.92}}>
        수능 영어 최저 <span style={{color: R.hl}}>30일 공략</span>
      </div>
      <div style={{position: 'absolute', left: LEFT, top: TOP, width: W, height: H, perspective: 5200, perspectiveOrigin: '50% 0%'}}>
        {/* paper stack thickness */}
        {Array.from({length: Math.min(remaining + 1, 4)}, (_, k) => 4 - k).map((k) => (
          <div key={k} style={{
            position: 'absolute', inset: 0, ...paperBg, background: k % 2 ? '#F1EDE4' : '#F7F4EC',
            transform: `translateY(${k * 7}px)`, boxShadow: k === 4 || k === Math.min(remaining + 1, 4) ? '0 30px 60px rgba(0,0,0,0.45)' : 'none',
          }} />
        ))}
        <Sheet i={under} f={f} />
        {flipping && (
          <>
            {/* shadow cast by the lifting page */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: H * Math.max(Math.cos(rad), 0) + 60, borderRadius: 18,
              background: 'linear-gradient(to bottom, rgba(10,15,30,0.05), rgba(10,15,30,0.35))', opacity: Math.sin(rad), filter: 'blur(10px)',
            }} />
            {ang > 90 && <Rings inside />}
            <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 0%', transformStyle: 'preserve-3d', transform: `rotateX(${ang}deg)`}}>
              <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
                <Sheet i={under - 1} f={f} />
                <div style={{position: 'absolute', inset: 0, borderRadius: 18, background: `linear-gradient(to top, rgba(0,0,0,${0.25 * Math.sin(rad)}), rgba(255,255,255,${0.15 * Math.sin(rad)}))`}} />
              </div>
              <div style={{
                position: 'absolute', inset: 0, ...paperBg, background: '#EFEBE2', backfaceVisibility: 'hidden', transform: 'rotateX(180deg)',
                opacity: interpolate(ang, [150, 180], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              }}>
                <div style={{position: 'absolute', inset: 0, borderRadius: 18, background: `linear-gradient(to bottom, rgba(0,0,0,${0.3 * Math.sin(rad)}), transparent)`}} />
              </div>
            </div>
          </>
        )}
      </div>
      {!(flipping && ang > 90) && <Rings />}
    </AbsoluteFill>
  );
};
