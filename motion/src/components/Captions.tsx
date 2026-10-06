import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT, FPS} from '../theme';
import {Segment} from '../types';

type Line = {s: number; e: number; text: string};

/** Split transcript into short caption lines (≤ maxChars), using word timings. */
export const buildLines = (segs: Segment[], maxChars = 24): Line[] => {
  const out: Line[] = [];
  for (const seg of segs) {
    const words = seg.words.length ? seg.words : [{s: seg.start, e: seg.end, w: seg.text}];
    let cur: Line | null = null;
    for (const w of words) {
      const t = w.w.trim();
      if (!t) continue;
      if (cur && (cur.text + ' ' + t).length > maxChars) { out.push(cur); cur = null; }
      cur = cur ? {s: cur.s, e: w.e, text: cur.text + ' ' + t} : {s: w.s, e: w.e, text: t};
    }
    if (cur) out.push(cur);
  }
  // Hold each line until the next one starts (max +0.6s) to avoid flicker.
  return out.map((l, i) => ({...l, e: Math.min(Math.max(l.e, (out[i + 1]?.s ?? l.e + 0.6) - 0.02), l.e + 0.6)}));
};

export const Captions: React.FC<{segments: Segment[]}> = ({segments}) => {
  const f = useCurrentFrame();
  const lines = useMemo(() => buildLines(segments), [segments]);
  const t = f / FPS;
  const line = lines.find((l) => t >= l.s && t < l.e);
  if (!line) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', fontFamily: FONT}}>
      <div style={{background: 'rgba(21,24,30,0.88)', color: '#fff', fontSize: 44, fontWeight: 600, letterSpacing: -0.5,
        padding: '14px 34px', borderRadius: 16, maxWidth: 1500, textAlign: 'center'}}>{line.text}</div>
    </div>
  );
};
