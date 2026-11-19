import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT} from '../theme';
import '../fonts';

/** Lecture card (1080x1920, white) for recording on the iPad: series title centred on top, card number, headline, example. */
export type StudyCardProps = {series: string; no: string; head: string[]; label?: string; example?: string};
const BLUE = '#2352E8';

export const StudyCard: React.FC<StudyCardProps> = ({series, no, head, label, example}) => (
  <AbsoluteFill style={{background: '#fff', fontFamily: FONT, color: '#111', padding: '0 80px'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 130, textAlign: 'center', fontSize: 50, fontWeight: 800, letterSpacing: -1.5, color: BLUE}}>{series}</div>
    <div style={{position: 'absolute', left: 80, right: 80, top: 222, height: 3, background: '#E6E8EE'}} />
    <div style={{position: 'absolute', left: 80, top: 300, fontSize: 34, fontWeight: 700, color: '#9A9A9A'}}>{no}</div>
    <div style={{position: 'absolute', left: 80, right: 80, top: 360, fontSize: 78, fontWeight: 800, lineHeight: 1.25, letterSpacing: -2.5}}>
      {head.map((h, i) => <div key={i}>{h}</div>)}
    </div>
    {example ? (
      <div style={{position: 'absolute', left: 80, right: 80, top: 360 + head.length * 98 + 110}}>
        {label ? <div style={{display: 'inline-block', background: '#111', color: '#fff', fontSize: 30, fontWeight: 800, padding: '6px 18px', borderRadius: 6, marginBottom: 26}}>{label}</div> : null}
        <div style={{fontSize: 50, fontWeight: 700, lineHeight: 1.75, letterSpacing: -0.5}}>{example}</div>
      </div>
    ) : null}
  </AbsoluteFill>
);
