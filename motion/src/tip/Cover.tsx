import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Reel cover. Text stays inside the centre 3:4 area so the profile-grid crop keeps it. Line markup: {accent}. */
const BLUE = '#2352E8', RED = '#E8352B';
export type CoverProps = {dark?: boolean; lines?: string[]; bg?: string};
const DEFAULT = ['해석 못해도', '{주제 1분컷}', '하는 법'];

const Line: React.FC<{t: string; dark?: boolean}> = ({t, dark}) => {
  const accent = t.startsWith('{');
  const text = t.replace(/[{}]/g, '');
  return <div style={{fontSize: accent ? 172 : 150, color: accent ? RED : dark ? '#fff' : BLUE, whiteSpace: 'nowrap'}}>{text}</div>;
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
