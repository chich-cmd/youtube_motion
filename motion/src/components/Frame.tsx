import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {enter, exit} from '../anim';

/** Common scene wrapper: section label top-left, fade in/out. */
export const Frame: React.FC<{label?: string; len: number; children: React.ReactNode}> = ({label, len, children}) => {
  const f = useCurrentFrame();
  const o = Math.min(enter(f, 0, 12), exit(f, len));
  return (
    <AbsoluteFill style={{opacity: o, fontFamily: FONT, color: C.ink}}>
      {false && label ? (
        <div style={{position: 'absolute', left: 120, top: 92, display: 'flex', alignItems: 'center', gap: 14, ...{opacity: enter(f, 2)}}}>
          <div style={{width: 10, height: 10, borderRadius: 5, background: C.blue}} />
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: 1, color: C.sub}}>{label}</div>
        </div>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

export const Heading: React.FC<{text: string; top?: number}> = ({text, top = 140}) => {
  const f = useCurrentFrame();
  const p = enter(f, 4, 20);
  return (
    <div style={{position: 'absolute', left: 120, top, fontSize: 64, fontWeight: 800, letterSpacing: -1.5,
      opacity: p, transform: `translateY(${(1 - p) * 24}px)`}}>
      {text}
    </div>
  );
};
