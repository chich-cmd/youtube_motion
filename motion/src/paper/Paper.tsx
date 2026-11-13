import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, FPS} from '../theme';

/**
 * Vertical paper close-up with reel-style captions. Words wrapped in [brackets] are emphasised:
 * yellow, a touch bigger, and they pop in with a spring when the line appears.
 */
export type PaperLine = {s: number; e: number; text: string};
export type PaperProps = {video: string; lines: PaperLine[]};

const Word: React.FC<{text: string; strong: boolean; f0: number}> = ({text, strong, f0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = strong ? spring({frame: f - f0 - 3, fps, config: {damping: 9, stiffness: 160}}) : 1;
  return (
    <span style={{display: 'inline-block', color: strong ? '#FFD84D' : '#fff', fontSize: strong ? '1.08em' : '1em',
      transform: `scale(${strong ? 0.6 + 0.4 * k : 1})`, margin: '0 0.12em'}}>{text}</span>
  );
};

export const Paper: React.FC<PaperProps> = ({video, lines}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = lines.find((l) => t >= l.s && t < l.e);
  const f0 = line ? Math.round(line.s * FPS) : 0;
  const pop = line ? interpolate(f - f0, [0, 5], [0.85, 1], {extrapolateRight: 'clamp'}) : 1;
  const parts = line ? line.text.split(/(\[[^\]]+\])/).filter(Boolean) : [];
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONT, wordBreak: 'keep-all'}}>
      <OffthreadVideo src={staticFile(video)} />
      {line ? (
        <div style={{position: 'absolute', left: 50, right: 50, top: 1330, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontSize: 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.25, textAlign: 'center', transform: `scale(${pop})`,
            padding: '18px 34px', borderRadius: 24, background: 'rgba(15,17,22,0.72)',
            textShadow: '0 4px 14px rgba(0,0,0,0.45)'}}>
            {parts.map((p, i) => {
              const strong = p.startsWith('[');
              return <Word key={i} text={strong ? p.slice(1, -1) : p.trim()} strong={strong} f0={f0} />;
            })}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
