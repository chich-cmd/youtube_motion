import React from 'react';
import {AbsoluteFill, Audio, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Explainer-board reel: plain light background, STEP header, flat diagrams (circles / vs), serif example cards with labelled boxes, book photos, black caption box. */
export type GrTheme = {main: string; mainBg: string; sub: string; subBg: string; paper: string; grid?: boolean};  // grid on unless false
const DEF: GrTheme = {main: '#2352E8', mainBg: '#E3EBFF', sub: '#E0473E', subBg: '#FDE7E5', paper: '#FFFFFF'};
type C = 'red' | 'blue' | 'gray';
// paper grain: fractal noise tile
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.09 0"/></filter><rect width="400" height="400" filter="url(#n)"/></svg>')}")`;
export type GrEl =
  | {s: number; e?: number; k: 'circle'; x: number; y: number; r: number; text: string; c: C; sign?: '+' | '-'}
  | {s: number; e?: number; k: 'text'; x: number; y: number; text: string; size?: number; color?: string; center?: boolean}
  | {s: number; e?: number; k: 'card'; x: number; y: number; w: number; text: string; size?: number; marks?: {s: number; text: string; label: string; c: C}[]}
  | {s: number; e?: number; k: 'img'; x: number; y: number; w: number; src: string; cap?: string}
  | {s: number; e?: number; k: 'arrow'; x: number; y: number; w: number}
  | {s: number; e?: number; k: 'follow'; y: number; tap: number; avatar: string; name: string; sub: string}
  | {s: number; e?: number; k: 'point'; x: number; y: number; label?: string; v?: 'arrow' | 'curve' | 'ring' | 'tap' | 'line'}
  | {s: number; e?: number; k: 'tick'; x: number; y: number; size: number; type: 'x' | 'check'; c?: C};
export type GrProps = {theme?: GrTheme; top: string; step?: string; head: string; heads?: {s: number; step?: string; head: string}[]; audio?: string; els: GrEl[]; lines: {s: number; e: number; text: string}[]};
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);

export const Gr: React.FC<GrProps> = ({theme = DEF, top, step: step0, head: head0, heads, audio, els, lines}) => {
  const BLUE = theme.main;
  const PAL = {red: {bd: theme.sub, bg: theme.subBg, ink: theme.sub}, blue: {bd: theme.main, bg: theme.mainBg, ink: theme.main}, gray: {bd: '#9AA3B5', bg: '#F1F3F7', ink: '#4A5468'}};
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const pop = (s: number) => spring({frame: f - Math.round(s * fps), fps, config: {damping: 15, stiffness: 170}});
  const l = lines.find((x) => t >= x.s && t < x.e);
  const hd = heads ? [...heads].reverse().find((x) => t >= x.s) : undefined;
  const step = hd ? hd.step : step0, head = hd ? hd.head : head0;
  const kh = hd ? pop(hd.s) : 1;
  return (
    <AbsoluteFill style={{background: theme.paper, fontFamily: FONT}}>
      {audio ? <Audio src={staticFile(audio)} /> : null}
      {theme.grid !== false ? <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(40,60,100,0.055) 2px, transparent 2px), linear-gradient(90deg, rgba(40,60,100,0.055) 2px, transparent 2px)', backgroundSize: '60px 60px'}} /> : null}
      {/* top band: black with mint title, yellow key word */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 300, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 30,
        textAlign: 'center', fontFamily: DISPLAY.gothic, fontWeight: 800, fontSize: 86, fontWeight: 800, lineHeight: 1.2, color: '#16FEE8', letterSpacing: -1}}><div>{rows(top, '#EBFF0D')}</div></div>
      {step && /^[1-3]$/.test(step) ? (
        // chapter box: only the current chapter (next ones stay a surprise)
        <div style={{position: 'absolute', top: 345, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, kh * 1.5), transform: `scale(${0.8 + 0.2 * kh})`}}>
          <div style={{display: 'flex', gap: 54, background: '#fff', border: '3px solid #DDE2EC', borderRadius: 18, padding: '14px 46px'}}>
            <div style={{fontWeight: 900, fontSize: 60, letterSpacing: -1, color: BLUE}}>{step}. {['문법', '해석', '단어'][Number(step) - 1]}</div>
          </div>
        </div>
      ) : (
        <div style={{position: 'absolute', top: 345, left: 70, right: 70, opacity: Math.min(1, kh * 1.5), translate: `${(1 - kh) * -40}px 0`, display: 'flex', alignItems: 'center', gap: 22}}>
        {step ? <div style={{background: BLUE, color: '#fff', fontWeight: 900, fontSize: 52, padding: '6px 22px', borderRadius: 10, whiteSpace: 'nowrap'}}>{step}</div> : null}
        <div style={{fontWeight: 900, fontSize: Math.min(68, (step ? 700 : 940) / em(head)), color: '#111', letterSpacing: -1.5, whiteSpace: 'nowrap'}}>{rows(head, BLUE)}</div>
      </div>
      )}
      <div style={{position: 'absolute', inset: 0, transform: 'translateY(60px)'}}>{els.filter((e) => t >= e.s && (e.e === undefined || t < e.e)).map((e, i) => {
        const k = pop(e.s);
        const o = Math.min(1, k * 1.4);
        if (e.k === 'circle') {
          const p = PAL[e.c];
          return <div key={i} style={{position: 'absolute', left: e.x - e.r, top: e.y - e.r, width: e.r * 2, height: e.r * 2, transform: `scale(${0.6 + 0.4 * k})`, opacity: o}}>
            <div style={{width: '100%', height: '100%', borderRadius: '50%', background: p.bg, border: `6px solid ${p.bd}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: DISPLAY.gothic, fontWeight: 800, fontSize: Math.min(64, (e.r * 1.6) / Math.max(...e.text.split('\n').map(em))), color: p.ink, lineHeight: 1.15}}>{rows(e.text, '#111')}</div>
            {e.sign ? <div style={{position: 'absolute', left: e.r - 32, top: e.r * 2 + 16, width: 64, height: 64, borderRadius: '50%', background: p.bg, border: `4px solid #111`, fontWeight: 900, fontSize: 52, lineHeight: '56px', textAlign: 'center', color: '#111'}}>{e.sign === '+' ? '+' : '−'}</div> : null}
          </div>;
        }
        if (e.k === 'text') return <div key={i} style={{position: 'absolute', left: e.center ? 0 : e.x, right: e.center ? 0 : undefined, top: e.y, textAlign: e.center ? 'center' : 'left', fontFamily: DISPLAY.gothic, fontWeight: 800, fontSize: e.size ?? 64, color: e.color ?? '#111', opacity: o, lineHeight: 1.2}}>{rows(e.text, BLUE)}</div>;
        if (e.k === 'follow') {
          // follow prompt: profile card pops in, a tap ripple hits the button, button flips to following
          const done = t >= e.tap, kt = pop(e.tap);
          const rip = Math.max(0, Math.min(1, (t - e.tap + 0.25) / 0.5));
          return <div key={i} style={{position: 'absolute', left: 70, right: 70, top: e.y, opacity: o, transform: `scale(${0.85 + 0.15 * k})`}}>
            <div style={{background: '#fff', border: '3px solid #DDE2EC', borderRadius: 36, padding: '46px 44px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
              <div style={{width: 196, height: 196, borderRadius: '50%', padding: 8, background: 'conic-gradient(from 200deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5, #FEDA75)', flexShrink: 0}}>
                <Img src={staticFile(e.avatar)} style={{width: '100%', height: '100%', borderRadius: '50%', border: '6px solid #fff', boxSizing: 'border-box'}} /></div>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 14, fontWeight: 800, fontSize: 64, color: '#111'}}>{e.name}
                  <svg viewBox="0 0 40 40" width={50} height={50}><path d="M20 2 l5 4 6-1 2 6 5 3-2 6 2 6-5 3-2 6-6-1-5 4-5-4-6 1-2-6-5-3 2-6-2-6 5-3 2-6 6 1z" fill="#3897F0" /><path d="M13 20 l5 5 9-10" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div style={{fontWeight: 700, fontSize: 36, color: '#6B7280', marginTop: 6}}>{e.sub}</div>
              </div>
            </div>
            <div style={{position: 'relative', marginTop: 40}}>
              <div style={{background: done ? '#EFEFEF' : '#0095F6', color: done ? '#111' : '#fff', fontWeight: 900, fontSize: 76, textAlign: 'center', padding: '28px 0', borderRadius: 24,
                border: done ? '4px solid #DBDBDB' : '4px solid #0095F6',
                transform: `scale(${done ? 0.96 + 0.04 * kt : 1 + 0.045 * Math.sin((t - e.s) * 7)})`}}>{done ? '팔로잉 ✓' : '+ 팔로우'}</div>
              {rip > 0 && rip < 1 ? <div style={{position: 'absolute', left: '50%', top: '50%', width: 420 * rip, height: 420 * rip, marginLeft: -210 * rip, marginTop: -210 * rip,
                borderRadius: '50%', background: 'rgba(0,149,246,0.25)', opacity: 1 - rip}} /> : null}
            </div>
          </div>
          </div>;
        }
        if (e.k === 'point') {
          const v = e.v ?? 'arrow', dt = t - e.s;
          if (v === 'line') {
            // simple black arrow drawn on from upper-right, tip at (x, y), gentle nudge toward the tip
            const p = Math.min(1, dt / 0.3), n = dt > 0.3 ? Math.abs(Math.sin((dt - 0.3) * 6)) * 14 : 0;
            const ux = -0.5, uy = 0.866, len = 260;           // direction toward the tip (down-left)
            const tx = e.x + ux * n, ty = e.y + uy * n, sx = tx - ux * len, sy = ty - uy * len;
            const hx = (a: number) => tx - 70 * (ux * Math.cos(a) - uy * Math.sin(a)), hy = (a: number) => ty - 70 * (uy * Math.cos(a) + ux * Math.sin(a));
            const line = `M ${sx} ${sy} L ${sx + (tx - sx) * p} ${sy + (ty - sy) * p}`, head = `M ${hx(0.6)} ${hy(0.6)} L ${tx} ${ty} L ${hx(-0.6)} ${hy(-0.6)}`;
            return <div key={i} style={{position: 'absolute', left: 0, top: 0}}>
              <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                <path d={line} stroke="#fff" strokeWidth={30} strokeLinecap="round" fill="none" />
                {p >= 1 ? <path d={head} stroke="#fff" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
                <path d={line} stroke={BLUE} strokeWidth={16} strokeLinecap="round" fill="none" />
                {p >= 1 ? <path d={head} stroke={BLUE} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
              </svg>
              {e.label ? <div style={{position: 'absolute', left: sx + 20, top: sy - 70, background: BLUE, color: '#fff', fontWeight: 900, fontSize: 40, padding: '8px 24px', borderRadius: 999,
                whiteSpace: 'nowrap', opacity: Math.min(1, dt / 0.25), transform: `scale(${0.8 + 0.2 * k})`, transformOrigin: '0 100%'}}>{e.label}</div> : null}
            </div>;
          }
          if (v === 'curve') {
            // thin hand-drawn curve drawn on from the caption toward the target, small label at its start
            const p = Math.min(1, dt / 0.6), L = 700;
            return <div key={i} style={{position: 'absolute', left: 0, top: 0}}>
              <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                <path d={`M ${e.x + 330} ${e.y - 20} C ${e.x + 300} ${e.y + 90}, ${e.x + 140} ${e.y + 70}, ${e.x + 40} ${e.y + 10}`} fill="none" stroke={BLUE} strokeWidth={9} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
                {p >= 1 ? <path d={`M ${e.x + 78} ${e.y - 8} L ${e.x + 40} ${e.y + 10} L ${e.x + 76} ${e.y + 36}`} fill="none" stroke={BLUE} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /> : null}
              </svg>
              <div style={{position: 'absolute', left: e.x + 250, top: e.y - 96, fontWeight: 900, fontSize: 46, color: BLUE, opacity: Math.min(1, dt / 0.3), whiteSpace: 'nowrap'}}>{e.label ?? '여기서 팔로우!'}</div>
            </div>;
          }
          if (v === 'ring') {
            // pulsing rings on the spot + small pill label
            const rings = [0, 0.5, 1].map((d) => ((dt + d) % 1.5) / 1.5);
            return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, opacity: o}}>
              {rings.map((r, j) => <div key={j} style={{position: 'absolute', left: -40 - 90 * r, top: -40 - 90 * r, width: 80 + 180 * r, height: 80 + 180 * r, borderRadius: '50%', border: `5px solid ${BLUE}`, opacity: 1 - r}} />)}
              <div style={{position: 'absolute', left: -16, top: -16, width: 32, height: 32, borderRadius: '50%', background: BLUE}} />
              <div style={{position: 'absolute', left: 110, top: -42, background: BLUE, color: '#fff', fontWeight: 900, fontSize: 44, padding: '10px 26px', borderRadius: 999, whiteSpace: 'nowrap', transform: `scale(${0.8 + 0.2 * k})`, transformOrigin: '0 50%'}}>{e.label ?? '팔로우는 여기!'}</div>
            </div>;
          }
          if (v === 'tap') {
            // hand cursor glides in and taps the spot (ripple on each tap)
            const slide = Math.min(1, dt / 0.5), tp = Math.max(0, dt - 0.5) % 1.0, press = tp < 0.15 ? tp / 0.15 : tp < 0.3 ? 1 - (tp - 0.15) / 0.15 : 0;
            const rip = dt > 0.5 ? Math.min(1, tp / 0.6) : 0;
            return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, opacity: o}}>
              {rip > 0 ? <div style={{position: 'absolute', left: -70 * rip - 20, top: -70 * rip - 20, width: 140 * rip + 40, height: 140 * rip + 40, borderRadius: '50%', background: 'rgba(35,82,232,0.25)', opacity: 1 - rip}} /> : null}
              <svg viewBox="0 0 64 80" width={120} height={150} style={{position: 'absolute', left: -28 + (1 - slide) * 260, top: -8 + (1 - slide) * 120 + press * 10, transform: `scale(${1 - press * 0.08})`}}>
                <path d="M22 4c4 0 7 3 7 7v22l3-1c3-1 6 1 7 3l1 3 3-1c3-1 6 1 7 4l1 2 2-1c3 0 6 2 6 5v14c0 9-7 17-17 17H34c-7 0-12-4-15-10L8 46c-2-3-1-6 2-8s6-1 8 1l3 4V11c0-4 3-7 7-7z" fill="#fff" stroke="#111" strokeWidth={4} strokeLinejoin="round" />
              </svg>
              <div style={{position: 'absolute', left: 120, top: -110, color: '#111', fontWeight: 900, fontSize: 44, whiteSpace: 'nowrap', opacity: Math.min(1, dt / 0.4)}}>{e.label ?? '팔로우 꾹!'}</div>
            </div>;
          }
          const b = Math.abs(Math.sin(dt * 8)) * 26 * Math.min(1, k);
          return <svg key={i} width={340} height={130} viewBox="0 0 340 130" style={{position: 'absolute', left: e.x + b + (1 - Math.min(1, k)) * 300, top: e.y - 65, opacity: o, overflow: 'visible'}}>
            <path d="M4 65 L100 4 L100 40 L336 40 L336 90 L100 90 L100 126 Z" fill="#FFE600" stroke="#111" strokeWidth={9} strokeLinejoin="round" />
          </svg>;
        }
        if (e.k === 'tick') {
          // hand-drawn check / cross, stroke drawn on at its timing
          const p = Math.min(1, Math.max(0, (t - e.s) / 0.35));
          const col = e.c ? PAL[e.c].bd : (e.type === 'check' ? BLUE : PAL.red.bd);
          const L = 300;
          const paths = e.type === 'check' ? ['M10 55 L40 85 L95 15'] : ['M15 15 L85 85', 'M85 15 L15 85'];
          return <svg key={i} viewBox="0 0 100 100" style={{position: 'absolute', left: e.x - e.size / 2, top: e.y - e.size / 2, width: e.size, height: e.size, overflow: 'visible'}}>
            {paths.map((d, j) => { const q = Math.min(1, Math.max(0, p * paths.length - j));
              return <path key={j} d={d} fill="none" stroke={col} strokeWidth={e.type === 'x' ? 9 : 13} strokeOpacity={e.type === 'x' ? 0.75 : 1} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - q)} />; })}
          </svg>;
        }
        if (e.k === 'arrow') return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w * Math.min(1, k), height: 8, background: '#111', borderRadius: 4}}>
          <div style={{position: 'absolute', right: -6, top: -14, width: 0, height: 0, borderTop: '18px solid transparent', borderBottom: '18px solid transparent', borderLeft: '28px solid #111'}} /></div>;
        if (e.k === 'img') return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, opacity: o, transform: `translateY(${(1 - k) * 30}px)`}}>
          <Img src={staticFile(e.src)} style={{width: '100%', display: 'block', border: '2px solid #DDE2EC'}} />
          {e.cap ? <div style={{marginTop: 14, marginLeft: -200, marginRight: -200, textAlign: 'center', fontWeight: 800, fontSize: 32, color: '#111'}}>{e.cap}</div> : null}</div>;
        // serif example card with labelled boxes over phrases
        const parts = e.text.split(/(\[[^\]]+\])/).filter(Boolean);
        let mi = 0;
        return <div key={i} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, background: '#fff', border: '3px solid #DDE2EC', borderRadius: 18, padding: '70px 36px 34px', opacity: o,
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
      })}</div>
      {l ? <div style={{position: 'absolute', left: 0, right: 0, top: 1470, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#111', color: '#fff', fontWeight: 800, fontSize: Math.min(62, 930 / em(l.text)), padding: '14px 34px', whiteSpace: 'nowrap', letterSpacing: -1}}>{rows(l.text, '#FFD84D')}</div></div> : null}
      <div style={{position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center', fontFamily: DISPLAY.gothic, fontWeight: 800, fontSize: 52, color: BLUE}}>누보영어</div>
    </AbsoluteFill>
  );
};
