import React from 'react';
import {Emoji, ease, Hl, Motion, R, springy, Strike} from './ui';

export type Line = {t: string; size: 'm' | 'l' | 'xl' | 'xxl'; at?: number};
export type Cut = {emoji: string; from: string; motion: Motion; tag?: string; color?: keyof typeof R; lines: Line[]; vo: string[]};

const SIZE = {m: 66, l: 92, xl: 124, xxl: 190};

/** `**hl**` marker highlight, `[[red]]` accent colour, `~~x~~` struck out. */
const rich = (s: string, f: number, at: number) =>
  s.split(/(\*\*.+?\*\*|\[\[.+?\]\]|~~.+?~~)/).filter(Boolean).map((part, i) => {
    if (part.startsWith('**')) return <Hl key={i} f={f} at={at + 8}>{part.slice(2, -2)}</Hl>;
    if (part.startsWith('[[')) return <span key={i} style={{color: R.red}}>{part.slice(2, -2)}</span>;
    if (part.startsWith('~~')) return <Strike key={i} f={f} at={at + 8}>{part.slice(2, -2)}</Strike>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

/** f: frame relative to the cut's first narration line; c[i]: frame narration chunk i starts. */
export const Sheet: React.FC<{cut: Cut; f: number; c: number[]; swap: number}> = ({cut, f, c, swap}) => {
  const seen: Record<number, number> = {};
  const tagP = springy(f, -2, 13);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
      {cut.tag && (
        <div style={{
          background: R[cut.color ?? 'ink'], color: '#fff', fontSize: 58, fontWeight: 900, letterSpacing: -1.5,
          padding: '8px 34px 12px', borderRadius: 26, marginBottom: 40, transform: `scale(${0.7 + 0.3 * tagP})`, opacity: Math.min(1, tagP * 1.5),
        }}>{cut.tag}</div>
      )}
      <Emoji from={cut.from} to={cut.emoji} swapAt={swap} motion={cut.motion} f={f} size={300} />
      <div style={{height: 56}} />
      {cut.lines.map((ln, i) => {
        const k = ln.at ?? 0;
        const at = (c[k] ?? 0) + 5 * (seen[k] = (seen[k] ?? -1) + 1);
        const p = ease(f, at, 16);
        return (
          <div key={i} style={{
            fontSize: SIZE[ln.size], fontWeight: ln.size === 'm' ? 800 : 900, color: ln.size === 'm' ? R.sub : R.ink,
            letterSpacing: -SIZE[ln.size] * 0.035, lineHeight: 1.22, whiteSpace: 'nowrap',
            opacity: p, transform: `translateY(${(1 - p) * 36}px)`,
          }}>{rich(ln.t, f, at)}</div>
        );
      })}
    </div>
  );
};
