import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, FPS} from '../theme';

/** Background dot grid + top chapter progress bar. */
export const Background: React.FC = () => (
  <AbsoluteFill style={{background: C.bg,
    backgroundImage: 'radial-gradient(rgba(21,24,30,0.07) 1.6px, transparent 1.6px)', backgroundSize: '34px 34px'}} />
);

export const Progress: React.FC<{chapters: {title: string; start: number}[]; total: number}> = ({chapters, total}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < chapters[0].start) return null;
  return (
    <div style={{position: 'absolute', left: 120, right: 120, top: 40, display: 'flex', gap: 12, fontFamily: FONT}}>
      {chapters.map((c, i) => {
        const end = chapters[i + 1]?.start ?? total;
        const p = Math.max(0, Math.min(1, (t - c.start) / (end - c.start)));
        const active = p > 0 && p < 1;
        return (
          <div key={i} style={{flex: end - c.start}}>
            <div style={{height: 6, background: '#DEDAD1', borderRadius: 3, overflow: 'hidden'}}>
              <div style={{height: '100%', width: `${p * 100}%`, background: C.blue}} />
            </div>
            <div style={{fontSize: 20, fontWeight: 700, marginTop: 8, color: active ? C.ink : '#A3A7B0'}}>{c.title}</div>
          </div>
        );
      })}
    </div>
  );
};
