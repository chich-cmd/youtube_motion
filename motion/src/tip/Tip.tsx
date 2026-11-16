import React, {useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * Screen-recorded solving video (3:4) with captions.
 * Normal lines sit at the bottom; `step` lines (the solving method) sit mid-screen in a louder style.
 * Markup: {word} = key colour.
 */
export type TipLine = {s: number; e: number; text: string; step?: string};
export type TipStyle = 'A' | 'B' | 'C';
export type Zoom = {s: number; e: number; cx: number; cy: number; z: number; then?: Zoom[]};
export type TipProps = {video: string; lines: TipLine[]; look: TipStyle; reel?: boolean; title?: string; zooms?: Zoom[]};

/** Camera path (centre + zoom in the 1080x1440 video space), eased toward each shot's target frame by frame. */
const cameraPath = (zooms: Zoom[], n: number, fps: number) => {
  const home = {cx: 540, cy: 180 + 630, z: 1};
  const out: {cx: number; cy: number; z: number}[] = [];
  let c = {...home};
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    const sh = zooms.find((x) => t >= x.s && t < x.e);
    const sub = sh ? [...(sh.then ?? [])].reverse().find((x) => t >= x.s) ?? sh : null;
    const g = sub ? {cx: sub.cx, cy: sub.cy, z: sh!.z === sub.z ? sub.z : Math.min(sh!.z, sub.z)} : home;
    const a = 0.12;                        // smoothing per frame (~0.6s settle)
    c = {cx: c.cx + (g.cx - c.cx) * a, cy: c.cy + (g.cy - c.cy) * a, z: c.z + (g.z - c.z) * a};
    out.push(c);
  }
  return out;
};
// 9:16 layout: the iPad toolbar (top 240px of the 1440x1920 source) is cropped off, the page fills the width between a title band and a caption band.
const R = {top: 330, h: 1260, cut: 240};
const BLUE = '#2352E8';   // 누보영어 brand colour

const OUT = (c: string, w: number) => [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [-w, w], [w, -w], [-w, -w]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(', ');
const runs = (t: string, key: string) => t.split(/(\{[^}]+\})/).filter(Boolean).map((p, i) =>
  p.startsWith('{') ? <span key={i} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={i}>{p}</React.Fragment>);
const rows = (t: string, key: string) => t.split('\n').map((r, i) => <div key={i}>{runs(r, key)}</div>);

// Rough rendered width in em, used to keep every caption on a single line.
const em = (t: string) => [...t.replace(/[{}]/g, '')].reduce((w, c) => w + (c === ' ' ? 0.28 : /[가-힣]/.test(c) ? 0.94 : /[①-⑤→]/.test(c) ? 0.9 : 0.56), 0);

const Bottom: React.FC<{l: TipLine; reel?: boolean}> = ({l, reel}) => {
  const text = l.text.replace(/[{}]/g, '');
  const size = Math.min(66, 960 / em(text));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: reel ? 1250 : 1700, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: '#111', color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: -1.5, lineHeight: 1.25,
        padding: '14px 34px', borderRadius: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

const Step: React.FC<{l: TipLine; look: TipStyle; k: number}> = ({l, look, k}) => {
  if (look === 'A') return (     // yellow highlighter band, heavy black type, red STEP tag
    <div style={{position: 'absolute', left: 0, right: 0, top: 780, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.8 + 0.2 * k})`, opacity: k}}>
      {l.step ? <div style={{fontFamily: DISPLAY.heavy, fontSize: 64, color: '#fff', background: '#E8352B', padding: '6px 30px', borderRadius: 14, transform: 'rotate(-3deg)', marginBottom: 18}}>{l.step}</div> : null}
      <div style={{background: 'linear-gradient(transparent 8%, #FFE45C 8%, #FFE45C 92%, transparent 92%)', padding: '16px 44px', fontFamily: DISPLAY.heavy,
        fontSize: 86, lineHeight: 1.25, color: '#111', textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.25)'}}>{rows(l.text, '#E8352B')}</div>
    </div>
  );
  if (look === 'B') return (     // dark rounded card, white rounded type, yellow keywords
    <div style={{position: 'absolute', left: 40, right: 40, top: 760, background: 'rgba(17,17,17,0.88)', borderRadius: 40, padding: '44px 40px 50px',
      textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', transform: `translateY(${(1 - k) * 60}px)`, opacity: k}}>
      {l.step ? <div style={{fontFamily: DISPLAY.round, fontSize: 54, color: '#111', background: '#FFD84D', display: 'inline-block', padding: '4px 28px', borderRadius: 999, marginBottom: 22}}>{l.step}</div> : null}
      <div style={{fontFamily: DISPLAY.round, fontSize: Math.min(82, 900 / Math.max(...l.text.split('\n').map(em))), lineHeight: 1.25, color: '#fff', whiteSpace: 'nowrap'}}>{rows(l.text, '#FFD84D')}</div>
    </div>
  );
  return (                       // handwritten sticky note, slightly tilted, red keywords
    <div style={{position: 'absolute', left: 60, right: 60, top: 740, background: '#FFF6B8', padding: '40px 40px 54px', transform: `rotate(-2deg) scale(${0.85 + 0.15 * k})`,
      opacity: k, boxShadow: '0 18px 40px rgba(0,0,0,0.3)', textAlign: 'center', borderTop: '34px solid #FFE36E'}}>
      {l.step ? <div style={{fontFamily: DISPLAY.hand, fontSize: 84, color: '#E8352B', marginBottom: 6}}>{l.step}</div> : null}
      <div style={{fontFamily: DISPLAY.hand, fontSize: 112, lineHeight: 1.05, color: '#1a1a1a'}}>{rows(l.text, '#E8352B')}</div>
    </div>
  );
};

export const Tip: React.FC<TipProps> = ({video, lines, look, reel, title, zooms}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const path = useMemo(() => cameraPath(zooms ?? [], durationInFrames, fps), [zooms, durationInFrames, fps]);
  const cam = path[Math.min(f, path.length - 1)];
  // place the camera centre at the middle of the 1080x1260 window, never showing past the page edges or the toolbar
  const tx = Math.min(0, Math.max(1080 - 1080 * cam.z, 540 - cam.cx * cam.z));
  const ty = Math.min(-R.cut * 0.75 * cam.z, Math.max(R.h - 1440 * cam.z, R.h / 2 - cam.cy * cam.z));
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  const k = l ? spring({frame: f - Math.round(l.s * fps), fps, config: {damping: 14, stiffness: 170}}) : 0;
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      {reel ? (<>
        <div style={{position: 'absolute', left: 0, top: R.top, width: 1080, height: R.h, overflow: 'hidden', borderTop: '4px solid #111', borderBottom: '4px solid #111'}}>
          <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1440, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`}} />
        </div>
        {title ? <div style={{position: 'absolute', left: 30, right: 30, top: 0, height: R.top, display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 92, lineHeight: 1.15, color: '#111'}}><div>{rows(title, BLUE)}</div></div> : null}
        {/* channel wordmark in the empty band under the page */}
        <div style={{position: 'absolute', left: 0, right: 0, top: R.top + R.h + 4, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{fontFamily: DISPLAY.heavy, fontSize: 74, color: BLUE, letterSpacing: 1}}>누보영어</div>
          </div>
        </div>
      </>) : <OffthreadVideo src={staticFile(video)} />}
      {l ? (l.step !== undefined ? <Step l={l} look={look} k={k} /> : <Bottom l={l} reel={reel} />) : null}
    </AbsoluteFill>
  );
};
