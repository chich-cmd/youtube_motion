import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import '../fonts';
import {FONT, FPS} from '../theme';
import {R, springy} from '../reel/ui';
import data from './upload1.json';

/** ink: lowest handwriting row (px) while the caption is up, measured from the video. */
type Cap = {s: number; e: number; t: string; emoji?: string; ea?: number; zoom?: number; ink: number};
const caps = data.captions as Cap[];
export const CAPTIONED_TOTAL = data.duration;

const fr = (s: number) => Math.round(s * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Punch-in zoom: snap in over 4 frames, hold, ease back out. */
const punch = (f: number, at: number) =>
  interpolate(f - at, [0, 4, 14, 32], [0, 1, 1, 0], clamp);

/** `**x**` yellow marker box, `[[x]]` red accent. */
const rich = (s: string, f: number, at: number) =>
  s.split(/(\*\*.+?\*\*|\[\[.+?\]\])/).filter(Boolean).map((part, i) => {
    if (part.startsWith('**')) {
      const p = springy(f, at + 3, 9);
      return (
        <span key={i} style={{
          display: 'inline-block', background: R.hl, borderRadius: 16, padding: '0 14px 4px', margin: '0 4px',
          WebkitTextStroke: '0px', transform: `scale(${0.7 + 0.3 * p}) rotate(${(1 - Math.min(p, 1)) * -6}deg)`,
          boxShadow: '0 5px 0 rgba(0,0,0,0.12)',
        }}>{part.slice(2, -2)}</span>
      );
    }
    if (part.startsWith('[[')) {
      const p = springy(f, at + 2, 8);
      return <span key={i} style={{color: R.red, display: 'inline-block', transform: `scale(${0.6 + 0.4 * p})`}}>{part.slice(2, -2)}</span>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

const Caption: React.FC<{c: Cap; f: number; side: number}> = ({c, f, side}) => {
  const at = fr(c.s);
  const p = springy(f, at, 13);
  const top = Math.max(1330, c.ink + 50);
  const beside = c.emoji !== undefined && top - (c.ink + 10) < STICKER - 40; // no room above → sticker next to the text
  return (
    <div style={{
      position: 'absolute', left: 50, right: 50, top, paddingLeft: beside ? STICKER * 0.9 : 0, display: 'flex', justifyContent: 'center', textAlign: 'center',
      transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 2),
    }}>
      <div style={{
        position: 'relative', fontFamily: FONT, fontSize: 84, fontWeight: 900, lineHeight: 1.3, letterSpacing: -2.5, color: R.ink, wordBreak: 'keep-all',
        WebkitTextStroke: '16px #fff', paintOrder: 'stroke fill', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))',
      }}>
        {rich(c.t, f, at)}
        {c.emoji && <Sticker name={c.emoji} f={f} at={fr(c.ea ?? c.s)} end={fr(c.e) - 2} side={beside ? 0 : side} beside={beside} />}
      </div>
    </div>
  );
};

/** Emoji sticker that pops onto a top corner of the caption, wiggles, and pops off at the caption's end. */
const STICKER = 170;
const Sticker: React.FC<{name: string; f: number; at: number; end: number; side: number; beside: boolean}> = ({name, f, at, end, side, beside}) => {
  if (f < at) return null;
  const p = springy(f, at, 8);
  const out = interpolate(f, [end - 4, end], [1, 0], clamp);
  const t = (f - at) / FPS;
  const wiggle = Math.sin(t * 9) * 9 * Math.exp(-t * 1.2) + Math.sin(t * 3) * 5;
  const hop = Math.abs(Math.sin(t * 4.5)) * 12;
  const S = STICKER;
  return (
    <div style={{
      position: 'absolute', width: S, height: S,
      ...(beside ? {top: -20, left: -S - 4} : {top: -S + 30, [side ? 'right' : 'left']: -S * 0.35}),
      transform: `translateY(${-hop}px) scale(${p * out}) rotate(${(1 - Math.min(p, 1)) * (side ? 40 : -40) + wiggle}deg)`,
      filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.22))',
    }}>
      <Img src={staticFile(`emoji/${name}.png`)} style={{width: S, height: S}} />
    </div>
  );
};

export const Captioned: React.FC = () => {
  const f = useCurrentFrame();
  const zooms = caps.filter((c) => c.zoom !== undefined).map((c) => fr(c.zoom!));
  const z = Math.max(0, ...zooms.map((at) => punch(f, at)));
  const cur = caps.find((c) => f >= fr(c.s) && f < fr(c.e));
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <AbsoluteFill style={{transform: `scale(${1 + 0.08 * z})`, transformOrigin: '50% 58%'}}>
        <OffthreadVideo src={staticFile(data.video)} muted />
      </AbsoluteFill>
      {/* focus vignette during punch-ins */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(20,20,40,0.28) 100%)', opacity: z}} />
      {cur && <Caption c={cur} f={f} side={caps.filter((c) => c.emoji && c.s <= cur.s).length % 2} />}
    </AbsoluteFill>
  );
};
