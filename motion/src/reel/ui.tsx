import React from 'react';
import {Easing, Img, interpolate, spring, staticFile} from 'remotion';
import {FPS} from '../theme';

export const R = {
  paper: '#FFFDF8',
  ink: '#16181D',
  sub: '#6B7080',
  faint: '#B9BCC6',
  hl: '#FFE36E',
  red: '#E5483D',
  orange: '#F08A24',
  blue: '#2F66E0',
  purple: '#7B4BE0',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = (f: number, at: number, dur = 14) =>
  interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.bezier(0.2, 0.8, 0.2, 1)});
export const springy = (f: number, at: number, damping = 11) =>
  spring({frame: f - at, fps: FPS, config: {damping, stiffness: 160, mass: 0.6}});

export type Motion = 'jump' | 'nod' | 'shake' | 'tilt' | 'pulse' | 'wobble';

/** Idle body language per cut: [translateY px, rotate deg, scaleX, scaleY]. */
const idle = (m: Motion, t: number): [number, number, number, number] => {
  const beat = (period: number) => (t % period) / period; // 0→1 sawtooth
  switch (m) {
    case 'jump': {
      const b = beat(1.1), h = b < 0.45 ? Math.sin((b / 0.45) * Math.PI) : 0;
      const land = b >= 0.45 && b < 0.6 ? Math.sin(((b - 0.45) / 0.15) * Math.PI) : 0;
      return [-h * 38, 0, 1 + land * 0.1, 1 - land * 0.12 + h * 0.04];
    }
    case 'nod': {
      const b = beat(0.9), n = b < 0.35 ? Math.sin((b / 0.35) * Math.PI) : 0;
      return [n * 14, n * 4, 1 + n * 0.03, 1 - n * 0.06];
    }
    case 'shake': {
      const b = beat(1.4), env = b < 0.4 ? Math.sin((b / 0.4) * Math.PI) : 0;
      return [0, Math.sin(t * 28) * 11 * env, 1, 1];
    }
    case 'tilt': return [Math.sin(t * 2.2) * 6, Math.sin(t * 1.5) * 13, 1, 1];
    case 'pulse': {
      const b = beat(0.75), p = Math.exp(-b * 6) * Math.sin(b * Math.PI * 4);
      return [0, 0, 1 + p * 0.08, 1 + p * 0.08];
    }
    case 'wobble': return [0, Math.sin(t * 4) * 7, 1 + Math.sin(t * 8) * 0.04, 1 - Math.sin(t * 8) * 0.04];
  }
};

/** Fluent 3D face: pops in, moves with its cut's body language, and squashes into a new expression at `swapAt`. */
export const Emoji: React.FC<{from: string; to: string; swapAt: number; motion: Motion; f: number; size: number}> = ({from, to, swapAt, motion, f, size}) => {
  const p = springy(f, 0, 10);
  const t = Math.max(0, f) / FPS;
  const [y, rot, sx, sy] = idle(motion, t);
  // squash for 4 frames before the swap, then a springy stretch back
  const pre = interpolate(f, [swapAt - 4, swapAt], [0, 1], clamp);
  const post = f >= swapAt ? spring({frame: f - swapAt, fps: FPS, config: {damping: 7, stiffness: 220, mass: 0.6}}) : 0;
  const squash = f < swapAt ? pre : 1 - post;
  const pop = f >= swapAt ? Math.sin(Math.min(1, (f - swapAt) / 8) * Math.PI) : 0;
  const scaleX = sx * (1 + squash * 0.16), scaleY = sy * (1 - squash * 0.2 + pop * 0.08);
  return (
    <div style={{width: size, height: size, position: 'relative'}}>
      <div style={{
        position: 'absolute', left: '22%', right: '22%', bottom: -size * 0.05, height: size * 0.08, borderRadius: '50%',
        background: 'rgba(30,25,15,0.2)', filter: `blur(${size * 0.035}px)`, transform: `scale(${p * (1 + y / 160)})`,
      }} />
      <Img src={staticFile(`emoji/${f < swapAt ? from : to}.png`)} style={{
        width: size, height: size, position: 'absolute', left: 0, top: 0, transformOrigin: '50% 90%',
        transform: `translateY(${y - 8 - pop * 16}px) rotate(${rot + (1 - Math.min(p, 1)) * -30}deg) scale(${p * scaleX}, ${p * scaleY})`,
        filter: 'drop-shadow(0 12px 14px rgba(40,30,10,0.16))',
      }} />
    </div>
  );
};

/** Marker highlight sweeping left→right behind the text. */
export const Hl: React.FC<{f: number; at: number; children: React.ReactNode}> = ({f, at, children}) => (
  <span style={{
    backgroundImage: `linear-gradient(${R.hl}, ${R.hl})`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${ease(f, at, 16) * 100}% 40%`, backgroundPosition: '0 88%', padding: '0 8px', margin: '0 -8px',
  }}>{children}</span>
);

/** Strike-through drawn across the text. */
export const Strike: React.FC<{f: number; at: number; children: React.ReactNode}> = ({f, at, children}) => (
  <span style={{position: 'relative', color: R.faint}}>
    {children}
    <span style={{position: 'absolute', left: -6, top: '54%', height: '0.09em', width: `calc(${ease(f, at, 12) * 100}% + 12px)`, background: R.red, borderRadius: 6}} />
  </span>
);
