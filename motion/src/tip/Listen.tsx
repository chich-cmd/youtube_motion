import React, {useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DISPLAY} from '../fonts';
import {Bottom, Step, TipLine, Zoom} from './Tip';

/**
 * 9:16 reel from a landscape (1920x1080) screen recording: a fixed crop of the page fills the width,
 * a camera eases in on pen strokes, captions sit under the page window, step cards float over it.
 */
export type ListenProps = {video: string; lines: TipLine[]; zooms: Zoom[]; title: string;
  crop: {x: number; y: number; w: number; h: number}; winTop: number};
const BLUE = '#2352E8';

const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));

export const Listen: React.FC<ListenProps> = ({video, lines, zooms, title, crop, winTop}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const k = 1080 / crop.w, winH = crop.h * k;
  const path = useMemo(() => {
    const home = {cx: crop.x + crop.w / 2, cy: crop.y + crop.h / 2, z: 1};
    let c = {...home};
    const out: typeof home[] = [];
    for (let i = 0; i < durationInFrames; i++) {
      const t = i / fps;
      const sh = zooms.find((x) => t >= x.s && t < x.e);
      const sub = sh ? [...(sh.then ?? [])].reverse().find((x) => t >= x.s) ?? sh : null;
      const g = sub ? {cx: sub.cx, cy: sub.cy, z: Math.min(sh!.z, sub.z)} : home;
      c = {cx: c.cx + (g.cx - c.cx) * 0.12, cy: c.cy + (g.cy - c.cy) * 0.12, z: c.z + (g.z - c.z) * 0.12};
      out.push(c);
    }
    return out;
  }, [zooms, durationInFrames, fps, crop]);
  const cam = path[Math.min(f, path.length - 1)];
  const S = k * cam.z;
  const tx = Math.min(-crop.x * S, Math.max(1080 - (crop.x + crop.w) * S, 540 - cam.cx * S));
  const ty = Math.min(-crop.y * S, Math.max(winH - (crop.y + crop.h) * S, winH / 2 - cam.cy * S));
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  const kk = l ? spring({frame: f - Math.round(l.s * fps), fps, config: {damping: 14, stiffness: 170}}) : 0;
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: winTop, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 100, lineHeight: 1.15, color: '#111'}}><div>{rows(title, BLUE)}</div></div>
      <div style={{position: 'absolute', left: 0, top: winTop, width: 1080, height: winH, overflow: 'hidden', borderTop: '4px solid #111', borderBottom: '4px solid #111'}}>
        <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${S})`}} />
      </div>
      {l ? (l.step !== undefined ? <Step l={l} look="B" k={kk} top={winTop + winH / 2 - 190} /> : <Bottom l={l} reel top={winTop + winH + 24} />) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1600, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: DISPLAY.heavy, fontSize: 74, color: BLUE, letterSpacing: 1}}>누보영어</div>
    </AbsoluteFill>
  );
};
