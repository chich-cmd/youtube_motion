import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** YouTube thumbnail 1280x720. Text on the left ~58%; right side left empty for the teacher's photo. */
const BLUE = '#2352E8', RED = '#E8352B', YEL = '#FFD84D';
export type ThumbProps = {v: 'A' | 'B' | 'C'; bg?: string};
const acc = (t: string, c: string) => t.split(/(\{[^}]+\})/).filter(Boolean).map((p, i) => p.startsWith('{') ? <span key={i} style={{color: c}}>{p.slice(1, -1)}</span> : <React.Fragment key={i}>{p}</React.Fragment>);

export const Thumb: React.FC<ThumbProps> = ({v, bg = 'cover_rp9_bg.jpg'}) => (
  <AbsoluteFill style={{background: '#111', fontFamily: DISPLAY.heavy, overflow: 'hidden'}}>
    {v !== 'C' ? <Img src={staticFile(bg)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${v === 'A' ? 6 : 3}px) brightness(${v === 'A' ? 0.28 : 0.35})`}} /> : null}
    {v === 'C' ? <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #0E1A3B 0%, #111 70%)'}} /> : null}
    {v === 'B' ? <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)'}} /> : null}
    <div style={{position: 'absolute', left: 64, top: 0, bottom: 0, width: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center', letterSpacing: -2}}>
      {v === 'A' ? (<>
        <div style={{color: '#fff', fontSize: 104, lineHeight: 1.18}}>
          <div>내신 2주 전</div><div style={{color: RED}}>벼락치기로</div><div>{acc('20점 올리는 법', RED)}</div>
        </div>
      </>) : null}
      {v === 'B' ? (<>
        <div style={{display: 'inline-block', alignSelf: 'flex-start', background: YEL, color: '#111', fontSize: 50, padding: '6px 24px', borderRadius: 12, marginBottom: 22, letterSpacing: 0}}>시험 2주 남았다면</div>
        <div style={{color: '#fff', fontSize: 112, lineHeight: 1.15}}><div>영어 내신</div><div>{acc('{20점} 올리는', RED)}</div><div>벼락치기</div></div>
      </>) : null}
      {v === 'C' ? (<>
        <div style={{color: '#fff', fontSize: 96, lineHeight: 1.18}}><div>내신 역전</div><div style={{color: RED}}>벼락치기 3단계</div></div>
        <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 46, color: '#fff', letterSpacing: -1}}>
          {['내용 숙지', '변형 문제 써먹기', '서술형 덩어리 암기'].map((s, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18}}>
              <div style={{width: 58, height: 58, borderRadius: '50%', background: YEL, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38}}>{i + 1}</div>{s}</div>))}
        </div>
      </>) : null}
      <div style={{marginTop: 40}}><span style={{background: BLUE, color: '#fff', fontSize: 46, padding: '6px 28px', borderRadius: 999, letterSpacing: 1}}>누보영어</span></div>
    </div>
  </AbsoluteFill>
);
