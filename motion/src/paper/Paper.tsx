import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, FPS} from '../theme';

/**
 * Vertical paper close-up in the style of hand-written study reels: a fixed two-part title on top
 * (keyword on a red block), and outlined captions with coloured keywords that pop in.
 * Caption markup: [word] = yellow, {word} = red, <word> = sky blue, (( word )) = green.
 */
export type PaperLine = {s: number; e: number; text: string};
export type PaperProps = {video: string; lines: PaperLine[]; title?: [string, string]};

const COLORS: Record<string, string> = {'[': '#FFE14D', '{': '#FF4B4B', '<': '#5EC8FF', '(': '#6BF07A'};
const STROKE = '0 0 2px #000, 0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 5px 12px rgba(0,0,0,0.5)';

const Word: React.FC<{text: string; color?: string; f0: number}> = ({text, color, f0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = color ? spring({frame: f - f0 - 2, fps, config: {damping: 8, stiffness: 170}}) : 1;
  return (
    <span style={{display: 'inline-block', color: color ?? '#fff', transform: `scale(${color ? 0.55 + 0.45 * k : 1})`,
      whiteSpace: 'pre'}}>{text}</span>
  );
};

const tokens = (text: string) => text.split(/(\[[^\]]+\]|\{[^}]+\}|<[^>]+>|\(\([^)]+\)\))/).filter(Boolean).map((p) => {
  const c = COLORS[p[0]];
  if (c && p.startsWith('((')) return {t: p.slice(2, -2), c};
  if (c && p[0] !== '(') return {t: p.slice(1, -1), c};
  return {t: p, c: undefined};
});

export const Paper: React.FC<PaperProps> = ({video, lines, title}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = lines.find((l) => t >= l.s && t < l.e);
  const f0 = line ? Math.round(line.s * FPS) : 0;
  const pop = line ? interpolate(f - f0, [0, 4], [0.88, 1], {extrapolateRight: 'clamp'}) : 1;
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONT, wordBreak: 'keep-all'}}>
      <OffthreadVideo src={staticFile(video)} />
      {title ? (
        <div style={{position: 'absolute', left: 30, right: 30, top: 380, textAlign: 'center', fontSize: 70, fontWeight: 900,
          letterSpacing: -2.5, lineHeight: 1.2}}>
          <span style={{background: '#E8231F', color: '#fff', padding: '2px 14px', borderRadius: 6,
            boxShadow: '0 0 0 3px #111'}}>{title[0]}</span>
          <span style={{color: '#111', marginLeft: 10, textShadow: '0 0 6px #fff, 0 0 3px #fff, 0 0 2px #fff'}}>{title[1]}</span>
        </div>
      ) : null}
      {line ? (
        <div style={{position: 'absolute', left: 40, right: 40, top: 1420, textAlign: 'center', fontSize: 84, fontWeight: 900,
          letterSpacing: -2.5, lineHeight: 1.25, textShadow: STROKE, transform: `scale(${pop})`}}>
          {tokens(line.text).map((w, i) => <Word key={i} text={w.t} color={w.c} f0={f0} />)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
