import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Simple motion-graphic reel: one focus element at a time (keyword, phrase or book image) + caption. */
export type Mg2Focus = {s: number; e: number; text?: string; img?: string; label?: string};
export type Mg2Props = {look: 'A' | 'B' | 'C'; title: string; steps: {s: number; e: number; n: number; key: string}[]; focus: Mg2Focus[]; lines: {s: number; e: number; text: string}[]};
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);
const TH = {
  A: {bg: '#FFFFFF', ink: '#111', acc: '#2352E8', sub: '#8A93A6', cap: {background: '#111', color: '#fff'}, capKey: '#FFD84D'},
  B: {bg: '#0E1A3B', ink: '#fff', acc: '#FFD84D', sub: '#7F8DB5', cap: {background: '#fff', color: '#111'}, capKey: '#2352E8'},
  C: {bg: '#F3EFE6', ink: '#1A1A1A', acc: '#E8352B', sub: '#9A9284', cap: {background: '#1A1A1A', color: '#fff'}, capKey: '#FFD84D'},
};

export const Mg2: React.FC<Mg2Props> = ({look, title, steps, focus, lines}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const th = TH[look];
  const pop = (s: number) => spring({frame: f - Math.round(s * fps), fps, config: {damping: 15, stiffness: 160}});
  const st = steps.find((x) => t >= x.s && t < x.e);
  const fo = focus.find((x) => t >= x.s && t < x.e);
  const l = lines.find((x) => t >= x.s && t < x.e);
  const kf = fo ? pop(fo.s) : 0;
  return (
    <AbsoluteFill style={{background: th.bg, fontFamily: FONT, color: th.ink}}>
      <div style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 64, lineHeight: 1.2}}>{rows(title, th.acc)}</div>
      {st ? (
        <div style={{position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{fontWeight: 800, fontSize: 40, color: th.sub, letterSpacing: 4}}>{String(st.n).padStart(2, '0')} / 03</div>
          <div style={{fontFamily: DISPLAY.heavy, fontSize: 120, color: th.acc, lineHeight: 1.1, marginTop: 6}}>{st.key}</div>
        </div>) : null}
      {fo ? (
        <div style={{position: 'absolute', top: st ? 620 : 520, left: 60, right: 60, height: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transform: `translateY(${(1 - kf) * 40}px)`, opacity: Math.min(1, kf * 1.3)}}>
          {fo.img ? (<>
            <Img src={staticFile(fo.img)} style={{height: 600, borderRadius: 12, boxShadow: look === 'B' ? '0 24px 60px rgba(0,0,0,0.5)' : '0 24px 60px rgba(0,0,0,0.18)'}} />
            {fo.label ? <div style={{marginTop: 28, fontWeight: 800, fontSize: 44}}>{fo.label}</div> : null}
          </>) : (
            <div style={{fontFamily: DISPLAY.heavy, fontSize: Math.min(120, 900 / Math.max(...fo.text!.split('\n').map(em))), lineHeight: 1.25, textAlign: 'center'}}>{rows(fo.text!, th.acc)}</div>
          )}
        </div>) : null}
      {l ? <div style={{position: 'absolute', left: 0, right: 0, top: 1460, display: 'flex', justifyContent: 'center'}}>
        <div style={{...th.cap, fontWeight: 800, fontSize: Math.min(58, 930 / em(l.text)), padding: '14px 34px', whiteSpace: 'nowrap', letterSpacing: -1}}>{rows(l.text, th.capKey)}</div></div> : null}
      <div style={{position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 52, color: look === 'B' ? '#fff' : '#2352E8'}}>누보영어</div>
    </AbsoluteFill>
  );
};
