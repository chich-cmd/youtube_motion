import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Reel cover. Text stays inside the centre 3:4 area so the profile-grid crop keeps it. Line markup: {accent}. */
const BLUE = '#2352E8', RED = '#E8352B';
export type CoverProps = {dark?: boolean; lines?: string[]; bg?: string};
const DEFAULT = ['해석 못해도', '{주제 1분컷}', '하는 법'];

// A line that is entirely {..} is the big red accent line; {..} inside a line colours just that part.
const Line: React.FC<{t: string; dark?: boolean}> = ({t: raw, dark}) => {
  let t = raw;
  const small = t.startsWith('_');            // '_text' = smaller sub-line
  if (small) t = t.slice(1);
  const whole = /^\{[^}]*\}$/.test(t);
  const base = dark ? '#fff' : BLUE;
  const em = [...t.replace(/[{}]/g, '')].reduce((w, c) => w + (c === ' ' ? 0.3 : /[가-힣]/.test(c) ? 0.98 : 0.6), 0);
  const size = Math.min(small ? 100 : whole ? 172 : 150, 990 / em);   // never wider than the frame
  return (
    <div style={{fontSize: size, color: whole ? RED : base, whiteSpace: 'nowrap', marginTop: small ? 24 : 0}}>
      {t.split(/(\{[^}]+\})/).filter(Boolean).map((p, i) => p.startsWith('{') ? <span key={i} style={{color: RED}}>{p.slice(1, -1)}</span> : <React.Fragment key={i}>{p}</React.Fragment>)}
    </div>
  );
};

export const Cover: React.FC<CoverProps> = ({dark, lines = DEFAULT, bg = 'cover_bg.jpg'}) => (
  <AbsoluteFill style={{background: dark ? '#111' : '#F2F3F5', fontFamily: DISPLAY.heavy, alignItems: 'center', justifyContent: 'center'}}>
    {dark ? (<>
      <Img src={staticFile(bg)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.3)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.6))'}} />
    </>) : null}
    <div style={{position: 'relative', textAlign: 'center', lineHeight: 1.18, letterSpacing: -2}}>
      {lines.map((t, i) => <Line key={i} t={t} dark={dark} />)}
      <div style={{marginTop: 70, fontSize: 76, color: dark ? '#fff' : BLUE, letterSpacing: 2}}>
        {dark ? <span style={{background: BLUE, padding: '6px 34px', borderRadius: 999}}>누보영어</span> : '누보영어'}
      </div>
    </div>
  </AbsoluteFill>
);
