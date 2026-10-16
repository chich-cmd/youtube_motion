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

/** Fluent 3D emoji: springy pop-in, slow idle float and sway, soft contact shadow. */
export const Emoji: React.FC<{name: string; f: number; at: number; size: number}> = ({name, f, at, size}) => {
  const p = springy(f, at, 10);
  const t = Math.max(0, f - at) / FPS;
  const bob = Math.sin(t * 2.2) * 9;
  const sway = Math.sin(t * 1.6) * 10;
  return (
    <div style={{width: size, height: size, position: 'relative', perspective: 700}}>
      <div style={{
        position: 'absolute', left: '22%', right: '22%', bottom: -size * 0.05, height: size * 0.08, borderRadius: '50%',
        background: 'rgba(30,25,15,0.2)', filter: `blur(${size * 0.035}px)`, transform: `scale(${p * (1 - bob / 90)})`,
      }} />
      <Img src={staticFile(`emoji/${name}.png`)} style={{
        width: size, height: size, position: 'absolute', left: 0, top: 0,
        transform: `translateY(${bob - 8}px) scale(${p}) rotateY(${sway}deg) rotate(${(1 - Math.min(p, 1)) * -30}deg)`,
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
