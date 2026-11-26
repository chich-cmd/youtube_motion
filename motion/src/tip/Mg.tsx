import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Pure motion-graphic reel (voice-over only). Three looks for sampling. */
export type MgScene = {s: number; e: number; n?: number; key: string; sub?: string; pts?: {s: number; t: string}[]; img?: string; imgLabel?: string};
export type MgProps = {look: 'A' | 'B' | 'C'; title: string; scenes: MgScene[]; lines: {s: number; e: number; text: string}[]};
const BLUE = '#2352E8', NAVY = '#0E1A3B', YEL = '#FFD84D', RED = '#E8352B';
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);
const STEPS = ['문법', '해석', '단어'];

export const Mg: React.FC<MgProps> = ({look, title, scenes, lines}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const sc = scenes.find((x) => t >= x.s && t < x.e) ?? scenes[scenes.length - 1];
  const sp = (s: number, d = 14) => spring({frame: f - Math.round(s * fps), fps, config: {damping: d, stiffness: 170}});
  const k = sp(sc.s);
  const l = lines.find((x) => t >= x.s && t < x.e);
  const dark = look === 'A';
  const ink = dark ? '#fff' : '#111';
  const acc = look === 'A' ? YEL : look === 'B' ? BLUE : RED;
  const bg: React.CSSProperties = look === 'A' ? {background: `radial-gradient(ellipse at 50% 30%, #1B2B5E 0%, ${NAVY} 70%)`}
    : look === 'B' ? {background: '#F4F6FB'}
      : {background: '#FFFDF4', backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 58px, #DCE6F5 58px 60px)'};
  return (
    <AbsoluteFill style={{...bg, fontFamily: FONT, color: ink}}>
      {look === 'C' ? <div style={{position: 'absolute', left: 110, top: 0, bottom: 0, width: 3, background: '#F2A7A7'}} /> : null}
      {/* series title */}
      <div style={{position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 78, lineHeight: 1.15}}>{rows(title, acc)}</div>
      {/* step progress */}
      {sc.n ? (
        <div style={{position: 'absolute', top: 320, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18}}>
          {STEPS.map((s, i) => {
            const on = i + 1 === sc.n, done = i + 1 < sc.n;
            return <div key={i} style={{padding: '10px 30px', borderRadius: look === 'C' ? 6 : 999, fontWeight: 800, fontSize: 36,
              background: on ? acc : look === 'A' ? 'rgba(255,255,255,0.1)' : '#fff', color: on ? (look === 'A' ? NAVY : '#fff') : done ? (dark ? '#9FB2E8' : '#7A8499') : (dark ? '#6F7FA8' : '#B0B7C6'),
              border: look === 'A' ? 'none' : `3px solid ${on ? acc : '#DDE3F0'}`, transform: look === 'C' ? `rotate(${i % 2 ? 1.5 : -1.5}deg)` : 'none'}}>{done ? '✓ ' : `${i + 1}. `}{s}</div>;
          })}
        </div>) : null}
      {/* key word */}
      <div style={{position: 'absolute', top: sc.n ? 450 : 520, left: 0, right: 0, textAlign: 'center', transform: `scale(${0.7 + 0.3 * k})`, opacity: Math.min(1, k)}}>
        {sc.n ? <div style={{fontFamily: DISPLAY.heavy, fontSize: 64, color: acc, marginBottom: 6}}>{['', '첫째', '둘째', '셋째'][sc.n]}</div> : null}
        <div style={{fontFamily: DISPLAY.heavy, fontSize: Math.min(190, 960 / Math.max(...sc.key.split('\n').map(em))), lineHeight: 1.1, display: 'inline-block', position: 'relative'}}>
          {look === 'C' ? <div style={{position: 'absolute', left: -20, right: -20, bottom: 18, height: '38%', background: 'rgba(255,221,0,0.55)', transformOrigin: '0 50%',
            transform: `scaleX(${interpolate(t, [sc.s + 0.3, sc.s + 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`, borderRadius: 6}} /> : null}
          <div style={{position: 'relative'}}>{rows(sc.key, look === 'C' ? RED : acc)}</div>
        </div>
        {sc.sub ? <div style={{fontWeight: 800, fontSize: 44, marginTop: 14, color: dark ? '#C9D3F2' : '#4A5468'}}>{sc.sub}</div> : null}
      </div>
      {/* bullet points + image */}
      <div style={{position: 'absolute', top: 820, left: 70, right: 70, display: 'flex', gap: 30, alignItems: 'flex-start'}}>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 22}}>
          {(sc.pts ?? []).filter((p) => t >= p.s).map((p, i) => {
            const kp = sp(p.s, 13);
            const card: React.CSSProperties = look === 'A' ? {background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: 22}
              : look === 'B' ? {background: '#fff', borderRadius: 22, boxShadow: '0 10px 30px rgba(14,26,59,0.10)', borderLeft: `12px solid ${BLUE}`}
                : {background: i % 2 ? '#FFF3A6' : '#DFF0FF', borderRadius: 4, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', transform: `rotate(${i % 2 ? 1 : -1}deg)`};
            return <div key={i} style={{...card, padding: '22px 28px', fontWeight: 800, fontSize: 40, lineHeight: 1.3,
              opacity: Math.min(1, kp * 1.3), translate: `${(1 - kp) * 120}px 0`}}>{rows(p.t, acc)}</div>;
          })}
        </div>
        {sc.img ? (() => {
          const ki = sp(sc.s + 0.4, 12);
          return <div style={{width: 330, flexShrink: 0, transform: `scale(${0.8 + 0.2 * ki}) rotate(${look === 'C' ? 3 : 0}deg)`, opacity: Math.min(1, ki),
            background: '#fff', padding: 12, borderRadius: look === 'C' ? 4 : 20, boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
            {sc.img.startsWith('ph:') ? <div style={{height: 430, background: '#E6E9F0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A93A6', fontWeight: 800, fontSize: 32, textAlign: 'center'}}>{sc.img.slice(3)}</div>
              : <Img src={staticFile(sc.img)} style={{width: '100%', display: 'block', borderRadius: 10}} />}
            {sc.imgLabel ? <div style={{marginTop: 10, textAlign: 'center', fontWeight: 800, fontSize: 28, color: '#111'}}>{sc.imgLabel}</div> : null}
          </div>;
        })() : null}
      </div>
      {/* caption */}
      {l ? <div style={{position: 'absolute', left: 0, right: 0, top: 1500, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#111', color: '#fff', fontWeight: 800, fontSize: Math.min(60, 930 / em(l.text)), padding: '14px 34px', whiteSpace: 'nowrap', letterSpacing: -1,
          border: dark ? '2px solid rgba(255,255,255,0.25)' : 'none'}}>{rows(l.text, YEL)}</div></div> : null}
      <div style={{position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 60, color: dark ? '#fff' : BLUE}}>
        {dark ? <span style={{background: BLUE, padding: '4px 30px', borderRadius: 999}}>누보영어</span> : '누보영어'}</div>
    </AbsoluteFill>
  );
};
