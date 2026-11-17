import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * Portrait iPad recording (2064x2752 source px) in a 9:16 reel with narration-timed marks:
 * highlighter sweeps, hand-drawn underlines/circles, or a spotlight on one region. Three looks for sampling.
 */
export type Mark = {s: number; kind: 'hl' | 'ul' | 'circle' | 'spot'; x: number; y: number; w: number; h: number};
export type AnnotLine = {s: number; e: number; text: string};
export type AnnotProps = {video: string; look: 'A' | 'B' | 'C'; marks: Mark[]; lines: AnnotLine[]; title: string};
const BLUE = '#2352E8', RED = '#E8352B';
const K = 1080 / 2064, TOP = 330, CUT = 236, WIN = 1260;
const P = (x: number, y: number) => [x * K, (y - CUT) * K + TOP];

const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));

const MarkView: React.FC<{m: Mark; look: AnnotProps['look']; t: number}> = ({m, look, t}) => {
  const p = interpolate(t, [m.s, m.s + 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p <= 0) return null;
  const [x, y] = P(m.x, m.y), w = m.w * K, h = m.h * K;
  if (m.kind === 'hl') return (   // marker sweep, multiply so the print stays crisp
    <div style={{position: 'absolute', left: x - 4, top: y - 2, width: (w + 8) * p, height: h + 4, background: look === 'C' ? 'rgba(35,82,232,0.22)' : 'rgba(255,221,0,0.55)',
      mixBlendMode: 'multiply', borderRadius: 4}} />);
  if (m.kind === 'ul') {          // slightly wobbly pen line drawn left to right
    const d = `M0 6 C ${w * 0.25} 2, ${w * 0.5} 10, ${w * 0.75} 4 S ${w} 6, ${w} 6`;
    return (<svg style={{position: 'absolute', left: x, top: y + h - 2, overflow: 'visible'}} width={w} height={14}>
      <path d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>);
  }
  if (m.kind === 'circle') {
    const rx = w / 2 + 16, ry = h / 2 + 12;
    const d = `M ${rx * 2} ${ry + 4} A ${rx} ${ry} 0 1 1 ${rx * 2 - 6} ${ry - 14}`;   // hand-drawn loop, ends just past the start
    return (<svg style={{position: 'absolute', left: x - 14, top: y - 10, overflow: 'visible'}} width={rx * 2} height={ry * 2}>
      <path d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>);
  }
  // spotlight: dim the page window except this box
  return (<div style={{position: 'absolute', left: x - 10, top: y - 8, width: w + 20, height: h + 16, borderRadius: 14,
    boxShadow: `0 0 0 4000px rgba(10,14,30,${0.55 * p})`, outline: `4px solid rgba(35,82,232,${p})`}} />);
};

const em = (t: string) => [...t.replace(/[{}]/g, '')].reduce((w, c) => w + (c === ' ' ? 0.28 : /[가-힣]/.test(c) ? 0.94 : 0.56), 0);

const Caption: React.FC<{l: AnnotLine; look: AnnotProps['look']}> = ({l, look}) => {
  const text = l.text;
  const box: React.CSSProperties = look === 'A'
    ? {background: '#111', color: '#fff', borderRadius: 22, padding: '14px 34px'}
    : look === 'B'
      ? {background: '#FFE14D', color: '#111', borderRadius: 10, padding: '12px 32px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'}
      : {background: '#fff', color: '#111', borderRadius: 18, padding: '14px 34px 14px 30px', borderLeft: `12px solid ${BLUE}`, boxShadow: '0 10px 30px rgba(0,0,0,0.25)'};
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1250, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: Math.min(62, 930 / em(text)), letterSpacing: -1.5, lineHeight: 1.25, whiteSpace: 'nowrap', ...box}}>
        {rows(text, look === 'C' ? BLUE : look === 'B' ? RED : '#FFD84D')}
      </div>
    </div>
  );
};

export const Annot: React.FC<AnnotProps> = ({video, look, marks, lines, title}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <div style={{position: 'absolute', left: 0, top: TOP, width: 1080, height: WIN, overflow: 'hidden', borderTop: '4px solid #111', borderBottom: '4px solid #111'}}>
        <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: 0, top: -CUT * K, width: 1080, height: 2752 * K}} />
        <div style={{position: 'absolute', left: 0, top: -TOP, width: 1080, height: 1920}}>
          {marks.map((m, i) => <MarkView key={i} m={m} look={look} t={t} />)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: TOP, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 92, lineHeight: 1.15, color: '#111'}}><div>{rows(title, BLUE)}</div></div>
      {l ? <Caption l={l} look={look} /> : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1600, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: DISPLAY.heavy, fontSize: 74, color: BLUE}}>누보영어</div>
    </AbsoluteFill>
  );
};
