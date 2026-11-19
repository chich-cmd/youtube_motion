import React, {useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * Portrait iPad recording (2064x2752 source px) in a 9:16 reel with narration-timed marks:
 * highlighter sweeps, hand-drawn underlines/circles, or a spotlight on one region. Three looks for sampling.
 */
export type Mark = {s: number; e?: number; kind: 'hl' | 'ul' | 'circle' | 'spot' | 'tag' | 'slash' | 'yhl'; x: number; y: number; w: number; h: number; text?: string};
export type AnnotLine = {s: number; e: number; text: string};
export type Note = {s: number; e?: number; x: number; y: number; text: string; size: number};
export type Card = {s: number; e: number; label: string; text: string};
export type AnnotProps = {video: string; look: 'A' | 'B' | 'C'; marks: Mark[]; lines: AnnotLine[]; title: string; cards?: Card[]; notes?: Note[]; cams?: {s: number; e: number; cx: number; cy: number; z: number}[]};
const BLUE = '#2352E8', RED = '#E8352B';
const K = 1080 / 2064, TOP = 330, CUT = 236, WIN = 1260;
const P = (x: number, y: number) => [x * K, (y - CUT) * K + TOP];

const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));

const MarkView: React.FC<{m: Mark; look: AnnotProps['look']; t: number}> = ({m, look, t}) => {
  const out = m.e === undefined ? 1 : interpolate(t, [m.e - 0.25, m.e], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const p = interpolate(t, [m.s, m.s + 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (m.kind === 'spot' ? out : 1);
  if (p <= 0 || out <= 0) return null;
  const [x, y] = P(m.x, m.y), w = m.w * K, h = m.h * K;
  if (m.kind === 'yhl') return (
    <div style={{position: 'absolute', left: x - 4, top: y - 2, width: (w + 8) * p, height: h + 4, background: 'rgba(255,221,0,0.6)', mixBlendMode: 'multiply', borderRadius: 4}} />);
  if (m.kind === 'tag') return (   // Korean gloss pill under a chunk
    <div style={{position: 'absolute', left: x - 60, top: m.text?.startsWith('^') ? y - 52 : y + h + 8, width: w + 120, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * 10}px)`}}>
      <div style={{background: BLUE, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 30, padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap'}}>{m.text?.replace(/^\^/, '')}</div>
    </div>);
  if (m.kind === 'slash') return (
    <svg style={{position: 'absolute', left: x - 12, top: y - 6, overflow: 'visible'}} width={24} height={h + 12}>
      <path d={`M20 0 L4 ${h + 12}`} stroke={RED} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} fill="none" /></svg>);
  if (m.kind === 'hl') return (   // marker sweep, multiply so the print stays crisp
    <div style={{position: 'absolute', left: x - 4, top: y - 2, width: (w + 8) * p, height: h + 4, background: look === 'C' ? 'rgba(35,82,232,0.22)' : 'rgba(255,221,0,0.55)',
      mixBlendMode: 'multiply', borderRadius: 4}} />);
  if (m.kind === 'ul') {          // slightly wobbly pen line drawn left to right
    const d = `M0 6 C ${w * 0.25} 2, ${w * 0.5} 10, ${w * 0.75} 4 S ${w} 6, ${w} 6`;
    return (<svg style={{position: 'absolute', left: x, top: y + h - 2, overflow: 'visible'}} width={w} height={14}>
      <path d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>);
  }
  if (m.kind === 'circle') {
    const rx = w / 2 + 8, ry = h / 2 + 10;
    const d = `M ${rx * 2} ${ry + 4} A ${rx} ${ry} 0 1 1 ${rx * 2 - 6} ${ry - 14}`;   // hand-drawn loop, ends just past the start
    return (<svg style={{position: 'absolute', left: x + w / 2 - rx, top: y + h / 2 - ry, overflow: 'visible'}} width={rx * 2} height={ry * 2}>
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
      : {background: '#111', color: '#fff', borderRadius: 0, padding: '14px 34px'};
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1250, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: Math.min(62, 930 / em(text)), letterSpacing: -1.5, lineHeight: 1.25, whiteSpace: 'nowrap', ...box}}>
        {rows(text, look === 'B' ? RED : '#FFD84D')}
      </div>
    </div>
  );
};

export const Annot: React.FC<AnnotProps> = ({video, look, marks, lines, title, cards, notes, cams}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  // camera (source px centre + zoom), eased frame by frame toward the active shot
  const path = useMemo(() => {
    const home = {cx: 1032, cy: CUT + WIN / K / 2, z: 1};
    const first = cams?.find((x) => x.s <= 0);
    let c = first ? {cx: first.cx, cy: first.cy, z: first.z} : {...home};
    const out: typeof home[] = [];
    for (let i = 0; i < durationInFrames; i++) {
      const tt = i / fps, g = cams?.find((x) => tt >= x.s && tt < x.e) ?? home;
      c = {cx: c.cx + (g.cx - c.cx) * 0.15, cy: c.cy + (g.cy - c.cy) * 0.15, z: c.z + (g.z - c.z) * 0.15};
      out.push(c);
    }
    return out;
  }, [cams, durationInFrames, fps]);
  const cam = path[Math.min(f, path.length - 1)];
  const fx = cam.cx * K, fy = (cam.cy - CUT) * K;
  const tx = Math.min(0, Math.max(1080 - 1080 * cam.z, 540 - fx * cam.z));
  const ty = Math.min(0, Math.max(WIN - WIN * cam.z, WIN / 2 - fy * cam.z));
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <div style={{position: 'absolute', left: 0, top: TOP, width: 1080, height: WIN, overflow: 'hidden', borderTop: '4px solid #111', borderBottom: '4px solid #111'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: WIN, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`}}>
          <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: 0, top: -CUT * K, width: 1080, height: 2752 * K}} />
          <div style={{position: 'absolute', left: 0, top: -TOP, width: 1080, height: 1920}}>
            {marks.map((m, i) => <MarkView key={i} m={m} look={look} t={t} />)}
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: TOP, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 92, lineHeight: 1.15, color: '#111'}}><div>{rows(title, BLUE)}</div></div>
      {notes?.filter((n) => t >= n.s && (n.e === undefined || t < n.e)).map((n, i) => {
        // hand-written note revealed left to right like pen writing
        const p = interpolate(t, [n.s, n.s + 1.4], [0, 100], {extrapolateRight: 'clamp'});
        return <div key={i} style={{position: 'absolute', left: n.x, top: n.y, fontFamily: DISPLAY.hand, fontSize: n.size, color: BLUE, whiteSpace: 'nowrap', WebkitTextStroke: '0.8px ' + BLUE,
          clipPath: `inset(-20px ${100 - p}% -20px -20px)`, transform: 'rotate(-1deg)'}}>{n.text}</div>;
      })}
      {cards?.filter((c) => t >= c.s && t < c.e).map((c, i) => {
        const k = spring({frame: f - Math.round(c.s * fps), fps, config: {damping: 14, stiffness: 170}});
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: TOP, width: 1080, height: WIN, background: `rgba(10,14,30,${0.55 * Math.min(1, k)})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{background: '#fff', borderRadius: 34, padding: '40px 70px 50px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
              transform: `scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k)}}>
              <div style={{display: 'inline-block', background: BLUE, color: '#fff', fontFamily: DISPLAY.round, fontSize: 50, padding: '6px 30px', borderRadius: 999, marginBottom: 18}}>{c.label}</div>
              <div style={{fontFamily: DISPLAY.heavy, fontSize: c.text.includes('\n') ? 92 : 120, color: '#111', lineHeight: 1.15, whiteSpace: 'nowrap'}}>{rows(c.text, BLUE)}</div>
            </div>
          </div>);
      })}
      {l ? <Caption l={l} look={look} /> : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1600, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: DISPLAY.heavy, fontSize: 74, color: BLUE}}>누보영어</div>
    </AbsoluteFill>
  );
};
