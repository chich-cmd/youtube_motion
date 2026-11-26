import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Reference-style voice-over reel: paper background, stroked hook title, stroked captions (no boxes), real-object look. */
const RED = '#FF3B30', GREEN = '#3DDC84';
const stroke = (w: number): React.CSSProperties => ({WebkitTextStroke: `${w}px #000`, paintOrder: 'stroke fill', textShadow: '0 4px 10px rgba(0,0,0,0.35)'});
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\}|\[[^\]]+\])/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span>
    : p.startsWith('[') ? <span key={j} style={{color: GREEN}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}[\]]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);

export type BbItem =
  | {s: number; kind: 'serif'; x: number; y: number; text: string; size?: number}
  | {s: number; kind: 'heavy'; x: number; y: number; text: string; size?: number; color?: string}
  | {s: number; kind: 'hand'; x: number; y: number; text: string; size?: number; color?: string; rot?: number}
  | {s: number; kind: 'img'; x: number; y: number; w: number; src: string; rot?: number}
  | {s: number; kind: 'line'; x: number; y: number; w: number; color?: string; strike?: boolean};
export type BbProps = {hook: string; items: BbItem[]; lines: {s: number; e: number; text: string}[]};

export const Bb: React.FC<BbProps> = ({hook, items, lines}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #FBFAF7 0%, #EDEBE6 75%, #DAD7D0 100%)'}}>
      {items.filter((it) => t >= it.s).map((it, i) => {
        const k = spring({frame: f - Math.round(it.s * fps), fps, config: {damping: 16, stiffness: 150}});
        const base: React.CSSProperties = {position: 'absolute', left: it.x, top: it.y, opacity: Math.min(1, k * 1.5)};
        if (it.kind === 'serif') return <div key={i} style={{...base, width: 960 - it.x + 60, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: it.size ?? 44, color: '#222', lineHeight: 1.6}}>{it.text}</div>;
        if (it.kind === 'heavy') return <div key={i} style={{...base, fontFamily: DISPLAY.heavy, fontSize: it.size ?? 120, color: it.color ?? '#111', lineHeight: 1.1, transform: `scale(${0.9 + 0.1 * k})`, transformOrigin: '0 50%'}}>{rows(it.text, RED)}</div>;
        if (it.kind === 'hand') {
          const p = interpolate(t, [it.s, it.s + 0.6], [0, 100], {extrapolateRight: 'clamp'});
          return <div key={i} style={{...base, opacity: 1, fontFamily: DISPLAY.hand, fontSize: it.size ?? 64, color: it.color ?? RED, whiteSpace: 'nowrap', clipPath: `inset(-20px ${100 - p}% -20px -20px)`, transform: `rotate(${it.rot ?? -3}deg)`}}>{it.text}</div>;
        }
        if (it.kind === 'img') return <Img key={i} src={staticFile(it.src)} style={{...base, width: it.w, transform: `rotate(${it.rot ?? 0}deg) translateY(${(1 - k) * 30}px)`, boxShadow: '0 18px 40px rgba(0,0,0,0.28)'}} />;
        const p = interpolate(t, [it.s, it.s + 0.35], [0, 1], {extrapolateRight: 'clamp'});
        return <div key={i} style={{position: 'absolute', left: it.x, top: it.y, width: it.w * p, height: it.strike ? 6 : 7, background: it.color ?? RED, borderRadius: 4, transform: 'rotate(-1deg)', opacity: 0.9}} />;
      })}
      <div style={{position: 'absolute', top: 190, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: Math.min(96, 980 / Math.max(...hook.split('\n').map(em))), lineHeight: 1.15, color: '#fff', ...stroke(14)}}>{rows(hook, RED)}</div>
      {l ? <div style={{position: 'absolute', top: 1380, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: Math.min(76, 960 / em(l.text)), color: '#fff', lineHeight: 1.2, ...stroke(10)}}>{rows(l.text, RED)}</div> : null}
    </AbsoluteFill>
  );
};
