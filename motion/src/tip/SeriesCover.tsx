import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Instagram series cover (3:4): brand-blue card, topic word big, "꿀팁" under it, channel name on top. */
const BLUE = '#2352E8';
export const SeriesCover: React.FC<{topic: string}> = ({topic}) => {
  const size = Math.min(300, 900 / (topic.length * 0.98));
  return (
    <AbsoluteFill style={{background: '#fff', fontFamily: DISPLAY.heavy, color: '#111', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'absolute', inset: 40, border: '6px solid #E4E8F5', borderRadius: 40}} />
      <div style={{position: 'absolute', top: 120, fontSize: 64, letterSpacing: 4, color: BLUE}}>누보영어</div>
      <div style={{textAlign: 'center', lineHeight: 1.05, marginTop: 40}}>
        <div style={{fontSize: size, letterSpacing: -4}}>{topic}</div>
        <div style={{display: 'inline-block', marginTop: 34, background: BLUE, color: '#fff', fontSize: 150, padding: '6px 60px 14px', borderRadius: 999}}>꿀팁</div>
      </div>
    </AbsoluteFill>
  );
};
