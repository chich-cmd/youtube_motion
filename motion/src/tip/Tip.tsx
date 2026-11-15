import React from 'react';
import {AbsoluteFill, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * Screen-recorded solving video (3:4) with captions.
 * Normal lines sit at the bottom; `step` lines (the solving method) sit mid-screen in a louder style.
 * Markup: {word} = key colour.
 */
export type TipLine = {s: number; e: number; text: string; step?: string};
export type TipStyle = 'A' | 'B' | 'C';
export type TipProps = {video: string; lines: TipLine[]; look: TipStyle};

const OUT = (c: string, w: number) => [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [-w, w], [w, -w], [-w, -w]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(', ');
const runs = (t: string, key: string) => t.split(/(\{[^}]+\})/).filter(Boolean).map((p, i) =>
  p.startsWith('{') ? <span key={i} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={i}>{p}</React.Fragment>);
const rows = (t: string, key: string) => t.split('\n').map((r, i) => <div key={i}>{runs(r, key)}</div>);

const Bottom: React.FC<{l: TipLine}> = ({l}) => (
  <div style={{position: 'absolute', left: 50, right: 50, bottom: 70, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 64,
    lineHeight: 1.3, color: '#fff', letterSpacing: -0.5, WebkitTextStroke: '9px #111', paintOrder: 'stroke fill', wordBreak: 'keep-all'}}>
    {rows(l.text, '#FFD84D')}
  </div>
);

const Step: React.FC<{l: TipLine; look: TipStyle; k: number}> = ({l, look, k}) => {
  if (look === 'A') return (     // yellow highlighter band, heavy black type, red STEP tag
    <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.8 + 0.2 * k})`, opacity: k}}>
      {l.step ? <div style={{fontFamily: DISPLAY.heavy, fontSize: 64, color: '#fff', background: '#E8352B', padding: '6px 30px', borderRadius: 14, transform: 'rotate(-3deg)', marginBottom: 18}}>{l.step}</div> : null}
      <div style={{background: 'linear-gradient(transparent 8%, #FFE45C 8%, #FFE45C 92%, transparent 92%)', padding: '16px 44px', fontFamily: DISPLAY.heavy,
        fontSize: 92, lineHeight: 1.25, color: '#111', textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.25)'}}>{rows(l.text, '#E8352B')}</div>
    </div>
  );
  if (look === 'B') return (     // dark rounded card, white rounded type, yellow keywords
    <div style={{position: 'absolute', left: 70, right: 70, top: 720, background: 'rgba(17,17,17,0.88)', borderRadius: 40, padding: '44px 40px 50px',
      textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', transform: `translateY(${(1 - k) * 60}px)`, opacity: k}}>
      {l.step ? <div style={{fontFamily: DISPLAY.round, fontSize: 54, color: '#111', background: '#FFD84D', display: 'inline-block', padding: '4px 28px', borderRadius: 999, marginBottom: 22}}>{l.step}</div> : null}
      <div style={{fontFamily: DISPLAY.round, fontSize: 88, lineHeight: 1.25, color: '#fff'}}>{rows(l.text, '#FFD84D')}</div>
    </div>
  );
  return (                       // handwritten sticky note, slightly tilted, red keywords
    <div style={{position: 'absolute', left: 110, right: 110, top: 700, background: '#FFF6B8', padding: '40px 40px 54px', transform: `rotate(-2deg) scale(${0.85 + 0.15 * k})`,
      opacity: k, boxShadow: '0 18px 40px rgba(0,0,0,0.3)', textAlign: 'center', borderTop: '34px solid #FFE36E'}}>
      {l.step ? <div style={{fontFamily: DISPLAY.hand, fontSize: 84, color: '#E8352B', marginBottom: 6}}>{l.step}</div> : null}
      <div style={{fontFamily: DISPLAY.hand, fontSize: 120, lineHeight: 1.05, color: '#1a1a1a'}}>{rows(l.text, '#E8352B')}</div>
    </div>
  );
};

export const Tip: React.FC<TipProps> = ({video, lines, look}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  const k = l ? spring({frame: f - Math.round(l.s * fps), fps, config: {damping: 14, stiffness: 170}}) : 0;
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <OffthreadVideo src={staticFile(video)} />
      {l ? (l.step !== undefined ? <Step l={l} look={look} k={k} /> : <Bottom l={l} />) : null}
    </AbsoluteFill>
  );
};
