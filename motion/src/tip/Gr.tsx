import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Explainer-board reel: plain light background, STEP header, flat diagrams (circles / vs), serif example cards with labelled boxes, book photos, black caption box. */
const BLUE = '#2352E8', RED = '#E0473E';
const PAL = {red: {bd: RED, bg: '#FDE7E5', ink: '#C9302C'}, blue: {bd: BLUE, bg: '#E3EBFF', ink: BLUE}, gray: {bd: '#9AA3B5', bg: '#F1F3F7', ink: '#4A5468'}};
type C = keyof typeof PAL;
export type GrEl =
  | {s: number; k: 'circle'; x: number; y: number; r: number; text: string; c: C; sign?: '+' | '-'}
  | {s: number; k: 'text'; x: number; y: number; text: string; size?: number; color?: string; center?: boolean}
  | {s: number; k: 'card'; x: number; y: number; w: number; text: string; size?: number; marks?: {s: number; text: string; label: string; c: C}[]}
  | {s: number; k: 'img'; x: number; y: number; w: number; src: string; cap?: string}
  | {s: number; k: 'arrow'; x: number; y: number; w: number};
export type GrProps = {top: string; step?: string; head: string; els: GrEl[]; lines: {s: number; e: number; text: string}[]};
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);

export const Gr: React.FC<GrProps> = ({top, step, head, els, lines}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const pop = (s: number) => spring({frame: f - Math.round(s * fps), fps, config: {damping: 15, stiffness: 170}});
  const l = lines.find((x) => t >= x.s && t < x.e);
  return (
    <AbsoluteFill style={{background: '#F6F7FA', fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 84, lineHeight: 1.2, color: '#111', letterSpacing: -1}}>{rows(top, '#E0473E')}</div>
      <div style={{position: 'absolute', top: 330, left: 70, right: 70, display: 'flex', alignItems: 'center', gap: 22}}>
        {step ? <div style={{background: BLUE, color: '#fff', fontWeight: 900, fontSize: 52, padding: '6px 22px', borderRadius: 10, whiteSpace: 'nowrap'}}>{step}</div> : null}
        <div style={{fontWeight: 900, fontSize: Math.min(68, (step ? 700 : 940) / em(head)), color: '#111', letterSpacing: -1.5, whiteSpace: 'nowrap'}}>{rows(head, BLUE)}</div>
      </div>
      {els.filter((e) => t >= e.s).map((e, i) => {
        const k = pop(e.s);
        const o = Math.min(1, k * 1.4);
        if (e.k === 'circle') {
          const p = PAL[e.c];
          return <div key={i} style={{position: 'absolute', left: e.x - e.r, top: e.y - e.r, width: e.r * 2, height: e.r * 2, transform: `scale(${0.6 + 0.4 * k})`, opacity: o}}>
            <div style={{width: '100%', height: '100%', borderRadius: '50%', background: p.bg, border: `6px solid ${p.bd}`, boxShadow: '0 8px 22px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: Math.min(64, (e.r * 1.6) / Math.max(...e.text.split('\n').map(em))), color: p.ink, lineHeight: 1.15}}>{rows(e.text, '#111')}</div>
            {e.sign ? <div style={{position: 'absolute', left: e.r - 32, top: e.r * 2 + 16, width: 64, height: 64, borderRadius: '50%', background: p.bg, border: `4px solid #111`, fontWeight: 900, fontSize: 52, lineHeight: '56px', textAlign: 'center', color: '#111'}}>{e.sign === '+' ? '+' : '−'}</div> : null}
          </div>;
        }
        if (e.k === 'text') return <div key={i} style={{position: 'absolute', left: e.center ? 0 : e.x, right: e.center ? 0 : undefined, top: e.y, textAlign: e.center ? 'center' : 'left', fontFamily: DISPLAY.heavy, fontSize: e.size ?? 64, color: e.color ?? '#111', opacity: o, lineHeight: 1.2}}>{rows(e.text, BLUE)}</div>;
        if (e.k === 'arrow') return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w * Math.min(1, k), height: 8, background: '#111', borderRadius: 4}}>
          <div style={{position: 'absolute', right: -6, top: -14, width: 0, height: 0, borderTop: '18px solid transparent', borderBottom: '18px solid transparent', borderLeft: '28px solid #111'}} /></div>;
        if (e.k === 'img') return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, opacity: o, transform: `translateY(${(1 - k) * 30}px)`}}>
          <Img src={staticFile(e.src)} style={{width: '100%', display: 'block', boxShadow: '0 16px 36px rgba(0,0,0,0.22)'}} />
          {e.cap ? <div style={{marginTop: 14, marginLeft: -200, marginRight: -200, textAlign: 'center', fontWeight: 800, fontSize: 32, color: '#111'}}>{e.cap}</div> : null}</div>;
        // serif example card with labelled boxes over phrases
        const parts = e.text.split(/(\[[^\]]+\])/).filter(Boolean);
        let mi = 0;
        return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, background: '#fff', borderRadius: 18, padding: '70px 36px 34px', boxShadow: '0 12px 34px rgba(14,26,59,0.14)', opacity: o,
          fontFamily: 'Georgia, "Times New Roman", serif', fontSize: e.size ?? 48, lineHeight: 2.1, color: '#222'}}>
          {parts.map((p, j) => {
            if (!p.startsWith('[')) return <React.Fragment key={j}>{p}</React.Fragment>;
            const m = e.marks?.[mi++];
            if (!m || t < m.s) return <React.Fragment key={j}>{p.slice(1, -1)}</React.Fragment>;
            const pp = PAL[m.c], km = pop(m.s);
            return <span key={j} style={{position: 'relative', background: pp.bg, border: `4px solid ${pp.bd}`, borderRadius: 6, padding: '2px 8px'}}>{p.slice(1, -1)}
              <span style={{position: 'absolute', left: '50%', bottom: '100%', transform: `translate(-50%, -6px) scale(${0.7 + 0.3 * km})`, whiteSpace: 'nowrap', fontFamily: FONT, fontWeight: 900, fontSize: 36, lineHeight: 1.2,
                color: '#fff', background: pp.bd, padding: '4px 14px', borderRadius: 8}}>{m.label}</span></span>;
          })}
        </div>;
      })}
      {l ? <div style={{position: 'absolute', left: 0, right: 0, top: 1470, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#111', color: '#fff', fontWeight: 800, fontSize: Math.min(62, 930 / em(l.text)), padding: '14px 34px', whiteSpace: 'nowrap', letterSpacing: -1}}>{rows(l.text, '#FFD84D')}</div></div> : null}
      <div style={{position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.heavy, fontSize: 52, color: BLUE}}>누보영어</div>
    </AbsoluteFill>
  );
};
