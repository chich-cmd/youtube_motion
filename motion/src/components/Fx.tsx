import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS} from '../theme';
import {DISPLAY} from '../fonts';

/**
 * Stylised one-off captions copied from the original edit (big coloured words, sound effects, thought bubbles,
 * hand-written lines). Times are output seconds; `seg` text may hold {color:...} runs.
 */
export type FxStyle = 'redSerif' | 'cyanBig' | 'sfx' | 'bubble' | 'hand' | 'yellowComic' | 'orangeBrush' | 'smallYellow';
export type Fx = {s: number; e: number; style: FxStyle; text: string; x?: number; y?: number};

const COL: Record<string, string> = {red: '#E8352B', blue: '#43C4F5', yellow: '#FFD84D', orange: '#FF8A1F', white: '#fff'};
const OUT = (c: string, w: number) => [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [-w, w], [w, -w], [-w, -w]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(', ');

const runs = (text: string) => text.split(/(\{\w+:[^}]*\})/).filter(Boolean).map((p, i) => {
  const m = p.match(/^\{(\w+):([^}]*)\}$/);
  return m ? <span key={i} style={{color: COL[m[1]] ?? m[1]}}>{m[2]}</span> : <React.Fragment key={i}>{p}</React.Fragment>;
});

const STYLE: Record<FxStyle, {font: string; size: number; color: string; shadow: string; y: number; weight?: number}> = {
  redSerif: {font: DISPLAY.serif, size: 92, color: COL.red, shadow: `${OUT('#fff', 3)}, 0 4px 10px rgba(0,0,0,0.35)`, y: 930, weight: 800},
  cyanBig: {font: DISPLAY.heavy, size: 132, color: COL.blue, shadow: `${OUT('#fff', 5)}, 0 6px 14px rgba(0,0,0,0.35)`, y: 880},
  sfx: {font: DISPLAY.serif, size: 70, color: '#fff', shadow: OUT('#111', 4), y: 80, weight: 800},
  bubble: {font: DISPLAY.heavy, size: 58, color: '#111', shadow: 'none', y: 80},
  hand: {font: DISPLAY.hand, size: 118, color: '#fff', shadow: `${OUT('#222', 3)}, 0 4px 12px rgba(0,0,0,0.5)`, y: 905},
  yellowComic: {font: DISPLAY.round, size: 76, color: COL.yellow, shadow: `${OUT('#222', 5)}, 0 4px 10px rgba(0,0,0,0.4)`, y: 930},
  orangeBrush: {font: DISPLAY.heavy, size: 112, color: COL.orange, shadow: `${OUT('#3a1d00', 4)}, 0 6px 14px rgba(0,0,0,0.45)`, y: 890},
  smallYellow: {font: DISPLAY.round, size: 40, color: COL.yellow, shadow: OUT('#222', 3), y: 846},
};

const One: React.FC<{fx: Fx}> = ({fx}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f0 = Math.round(fx.s * FPS), f1 = Math.round(fx.e * FPS);
  if (f < f0 || f >= f1) return null;
  const st = STYLE[fx.style];
  const k = spring({frame: f - f0, fps, config: {damping: 12, stiffness: 200}});
  const fade = interpolate(f, [f1 - 4, f1], [1, 0], {extrapolateLeft: 'clamp'});
  if (fx.style === 'bubble') {
    const lines = fx.text.split('\n');
    const shake = Math.sin(f * 1.7) * 3;
    return (
      <div style={{position: 'absolute', left: fx.x ?? 150, top: fx.y ?? 60, width: 470, height: 270, opacity: fade,
        transform: `scale(${k}) translate(${shake}px, 0)`, transformOrigin: 'bottom center'}}>
        <svg width={470} height={270} viewBox="0 0 470 270" style={{position: 'absolute', inset: 0}}>
          <path d="M70 170 q-60 -10 -40 -60 q-10 -60 60 -60 q20 -45 90 -35 q40 -30 100 -5 q70 -20 100 30 q60 10 45 70 q30 50 -30 70 q-10 40 -80 30 q-40 30 -100 10 q-60 25 -100 -5 q-60 5 -45 -45z"
            fill="#fff" stroke="#111" strokeWidth={6} />
          <circle cx={150} cy={242} r={13} fill="#fff" stroke="#111" strokeWidth={5} />
          <circle cx={128} cy={262} r={7} fill="#fff" stroke="#111" strokeWidth={4} />
        </svg>
        <div style={{position: 'absolute', inset: '30px 30px 60px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontFamily: st.font, fontSize: lines.length > 1 ? 44 : st.size, color: st.color, lineHeight: 1.15, textAlign: 'center'}}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    );
  }
  const centred = fx.x === undefined;
  return (
    <div style={{position: 'absolute', left: centred ? 0 : fx.x, right: centred ? 0 : undefined, top: fx.y ?? st.y, textAlign: 'center',
      fontFamily: st.font, fontSize: st.size, fontWeight: st.weight, color: st.color, textShadow: st.shadow, letterSpacing: -1,
      opacity: fade, transform: `scale(${0.7 + 0.3 * k})`, transformOrigin: centred ? 'center' : 'left center', whiteSpace: 'nowrap'}}>
      {runs(fx.text)}
    </div>
  );
};

export const FxLayer: React.FC<{fx: Fx[]}> = ({fx}) => {
  // Make sure every display face has the glyphs it needs before the first frame is captured.
  const [handle] = useState(() => delayRender('fx-fonts'));
  useEffect(() => {
    const need = new Map<string, string>();
    fx.forEach((x) => need.set(STYLE[x.style].font, (need.get(STYLE[x.style].font) ?? '') + x.text.replace(/\{\w+:|\}/g, '')));
    Promise.all([...need].map(([font, text]) => document.fonts.load(`80px "${font}"`, text))).then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [fx, handle]);
  return <>{fx.map((x, i) => <One key={i} fx={x} />)}</>;
};
