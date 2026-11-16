import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Reel cover. Text stays inside the centre 3:4 area so the profile-grid crop keeps it. */
const BLUE = '#2352E8', RED = '#E8352B';
export const Cover: React.FC<{dark?: boolean}> = ({dark}) => (
  <AbsoluteFill style={{background: dark ? '#111' : '#F2F3F5', fontFamily: DISPLAY.heavy, alignItems: 'center', justifyContent: 'center'}}>
    {dark ? (<>
      <Img src={staticFile('cover_bg.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.3)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.6))'}} />
    </>) : null}
    <div style={{position: 'relative', textAlign: 'center', lineHeight: 1.18, letterSpacing: -2}}>
      <div style={{fontSize: 150, color: dark ? '#fff' : BLUE}}>해석 못해도</div>
      <div style={{fontSize: 172, color: RED}}>주제 1분컷</div>
      <div style={{fontSize: 150, color: dark ? '#fff' : BLUE}}>하는 법</div>
      <div style={{marginTop: 70, fontSize: 76, color: dark ? '#fff' : BLUE, letterSpacing: 2}}>
        {dark ? <span style={{background: BLUE, padding: '6px 34px', borderRadius: 999}}>누보영어</span> : '누보영어'}
      </div>
    </div>
  </AbsoluteFill>
);
