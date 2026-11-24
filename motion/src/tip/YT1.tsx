import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * YouTube long-form 1 (수능 영어 노베이스 공부법) — 16:9 canvas.
 * Face cam lives in a circle at the bottom-right; the rest of the frame is motion graphics (no captions).
 * look A: light keyword cards · look B: notebook + highlighter · look C: dark minimal
 * Camera never moves; elements only fade/slide in once.
 */
export type Look = 'A' | 'B' | 'C';
export type Crop = {x: number; y: number; size: number}; // square crop of the 1440x1080 source
export type YT1Props = {video: string; look: Look; crop: Crop; scenes: Scene[]};
export type Scene =
  | {kind: 'hook'; s: number; chips: [number, string][]; titleAt: number; badgeAt: number}
  | {kind: 'who'; s: number}
  | {kind: 'insta'; s: number; statAt: number}
  | {kind: 'grade'; s: number; arrowAt: number; oneAt: number}
  | {kind: 'career'; s: number; gridAt: number; resultAt: number}
  | {kind: 'roadmap'; s: number; active: number};

const SRC_W = 1440, SRC_H = 1080;
const CIRCLE = {d: 430, right: 64, bottom: 56};
// usable content box (left of / above the circle)
const BOX = {x: 110, y: 90, w: 1250, h: 900};

type Theme = {bg: React.CSSProperties; ink: string; sub: string; accent: string; accent2: string; card: string; cardShadow: string;
  ring: string; head: string; headW: number; chipBg: string; chipInk: string; mute: string};
const TH: Record<Look, Theme> = {
  A: {bg: {background: '#F4F2EC'}, ink: '#15181E', sub: '#5B6270', accent: '#2B63D9', accent2: '#E0453A', card: '#fff', cardShadow: '0 18px 50px rgba(20,30,60,0.12)',
    ring: '#fff', head: FONT, headW: 900, chipBg: '#2B63D9', chipInk: '#fff', mute: '#C9CED8'},
  B: {bg: {backgroundColor: '#FBFAF5', backgroundImage: 'linear-gradient(#DCE6F5 2px, transparent 2px), linear-gradient(90deg, #DCE6F5 2px, transparent 2px)', backgroundSize: '54px 54px'},
    ink: '#1B1B1B', sub: '#4A4A4A', accent: '#2B63D9', accent2: '#E0453A', card: '#fff', cardShadow: '0 10px 0 rgba(0,0,0,0.06)',
    ring: '#1B1B1B', head: DISPLAY.hand, headW: 400, chipBg: '#FFE266', chipInk: '#1B1B1B', mute: '#BDBDBD'},
  C: {bg: {background: 'radial-gradient(circle at 30% 35%, #1B2A55 0%, #0B1430 70%)'}, ink: '#FFFFFF', sub: '#A9B6D9', accent: '#6E9BFF', accent2: '#FF5A4E', card: 'rgba(255,255,255,0.06)',
    cardShadow: 'none', ring: '#6E9BFF', head: FONT, headW: 900, chipBg: 'rgba(110,155,255,0.18)', chipInk: '#CFE0FF', mute: '#3A4770'},
};

const useT = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return {f, fps, t: f / fps}; };
/** 0→1 pop-in starting at second `at` */
const usePop = (at: number) => { const {f, fps} = useT(); return spring({frame: f - Math.round(at * fps), fps, config: {damping: 16, stiffness: 160}}); };
const In: React.FC<{at: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, dy = 30, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * dy}px)`, ...style}}>{children}</div>;
};
/** highlighter / underline swipe behind text */
const Swipe: React.FC<{at: number; color: string; look: Look; children: React.ReactNode}> = ({at, color, look, children}) => {
  const {t} = useT();
  const p = interpolate(t, [at, at + 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (look === 'C') return <span style={{color: p > 0.05 ? color : 'inherit'}}>{children}</span>;
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span style={{position: 'absolute', left: -8, bottom: '6%', height: look === 'B' ? '46%' : '38%', width: `calc(${p * 100}% + 16px)`,
        background: color, opacity: look === 'B' ? 0.75 : 0.32, borderRadius: look === 'B' ? 6 : 4, transform: look === 'B' ? 'rotate(-1deg)' : undefined}} />
      <span style={{position: 'relative'}}>{children}</span>
    </span>);
};

const Head: React.FC<{look: Look; size: number; children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({look, size, children, color, style}) => {
  const th = TH[look];
  return <div style={{fontFamily: th.head, fontWeight: th.headW, fontSize: look === 'B' ? size * 1.28 : size, color: color ?? th.ink, lineHeight: 1.15,
    letterSpacing: look === 'B' ? 0 : -2, ...style}}>{children}</div>;
};
const Chip: React.FC<{look: Look; children: React.ReactNode; big?: boolean}> = ({look, children, big}) => {
  const th = TH[look];
  return <span style={{display: 'inline-block', background: th.chipBg, color: th.chipInk, fontWeight: 800, fontSize: big ? 46 : 36, padding: big ? '14px 34px' : '10px 26px',
    borderRadius: look === 'B' ? 8 : 999, border: look === 'B' ? '3px solid #1B1B1B' : look === 'C' ? '2px solid rgba(110,155,255,0.5)' : undefined,
    transform: look === 'B' ? 'rotate(-1.5deg)' : undefined}}>{children}</span>;
};
const Card: React.FC<{look: Look; children: React.ReactNode; style?: React.CSSProperties}> = ({look, children, style}) => {
  const th = TH[look];
  return <div style={{background: th.card, borderRadius: look === 'B' ? 10 : 32, boxShadow: th.cardShadow, padding: '40px 48px',
    border: look === 'B' ? '3px solid #1B1B1B' : look === 'C' ? '2px solid rgba(255,255,255,0.12)' : undefined, ...style}}>{children}</div>;
};

/* ---------------- scenes ---------------- */
const Hook: React.FC<{look: Look; sc: Extract<Scene, {kind: 'hook'}>}> = ({look, sc}) => {
  const th = TH[look];
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 46}}>
      <div style={{display: 'flex', gap: 22, alignItems: 'center'}}>
        {sc.chips.map(([at, c], i) => <In key={i} at={at}><Chip look={look} big>{c}</Chip></In>)}
        <In at={sc.chips[sc.chips.length - 1][0] + 1.2}><span style={{fontSize: 44, fontWeight: 800, color: th.sub}}>필수 시청</span></In>
      </div>
      <In at={sc.titleAt} dy={40}>
        <Head look={look} size={128}>수능 영어<br /><Swipe at={sc.titleAt + 0.9} color={look === 'C' ? '#FFD84D' : look === 'B' ? '#FFE266' : th.accent} look={look}>노베이스</Swipe> 공부법</Head>
      </In>
      <In at={sc.badgeAt}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, fontSize: 48, fontWeight: 800, color: th.ink}}>
          <span style={{color: th.accent2, fontSize: 56}}>★</span>가장 도움 되는 영상, <span style={{color: th.accent}}>자신합니다</span>
        </div>
      </In>
    </div>);
};

const Who: React.FC<{look: Look; sc: Extract<Scene, {kind: 'who'}>}> = ({look, sc}) => {
  const th = TH[look];
  const k = usePop(sc.s + 1.1);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 60}}>
      <div style={{position: 'relative', transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5)}}>
        <Card look={look} style={{padding: '50px 80px', borderRadius: look === 'B' ? 10 : 60}}>
          <Head look={look} size={150}>누구세요<span style={{color: th.accent2}}>?</span></Head>
        </Card>
        {look !== 'C' ? <div style={{position: 'absolute', left: 90, bottom: -34, width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent',
          borderTop: `38px solid ${look === 'B' ? '#1B1B1B' : th.card}`}} /> : null}
      </div>
      <In at={sc.s + 4.4}><div style={{fontSize: 52, fontWeight: 800, color: th.sub, lineHeight: 1.4}}>쌤 소개<br /><span style={{color: th.ink}}>잠깐만 할게요</span></div></In>
    </div>);
};

const Insta: React.FC<{look: Look; sc: Extract<Scene, {kind: 'insta'}>}> = ({look, sc}) => {
  const th = TH[look];
  const {t} = useT();
  const n = Math.round(interpolate(t, [sc.statAt, sc.statAt + 1.2], [0, 10], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
  return (
    <In at={sc.s + 0.3} dy={50}>
      <Card look={look} style={{width: 1060, display: 'flex', alignItems: 'center', gap: 50, padding: '56px 64px'}}>
        <div style={{width: 210, height: 210, borderRadius: '50%', background: 'linear-gradient(135deg,#2B63D9,#59A6FF)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: DISPLAY.heavy, fontSize: 120, flexShrink: 0, border: look === 'B' ? '4px solid #1B1B1B' : undefined}}>N</div>
        <div>
          <div style={{fontSize: 36, fontWeight: 700, color: th.sub, marginBottom: 6}}>인스타그램</div>
          <Head look={look} size={86}>누보영어과외</Head>
          <div style={{marginTop: 22, fontSize: 64, fontWeight: 900, color: th.accent, letterSpacing: -1}}>
            팔로워 <span style={{fontVariantNumeric: 'tabular-nums'}}>{n}</span>만+</div>
        </div>
      </Card>
    </In>);
};

const Grade: React.FC<{look: Look; sc: Extract<Scene, {kind: 'grade'}>}> = ({look, sc}) => {
  const th = TH[look];
  const {t} = useT();
  const arrowP = interpolate(t, [sc.arrowAt, sc.arrowAt + 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const one = usePop(sc.oneAt);
  const box = (label: string, grade: string, color: string, sub: string) => (
    <Card look={look} style={{width: 440, textAlign: 'center', padding: '44px 30px'}}>
      <div style={{fontSize: 40, fontWeight: 800, color: th.sub}}>{label}</div>
      <div style={{fontFamily: look === 'B' ? DISPLAY.hand : DISPLAY.heavy, fontSize: look === 'B' ? 170 : 136, color, lineHeight: 1.1, margin: '18px 0', whiteSpace: 'nowrap'}}>{grade}</div>
      <div style={{fontSize: 34, fontWeight: 700, color: th.sub}}>{sub}</div>
    </Card>);
  return (
    <div>
      <In at={sc.s + 0.2}><Chip look={look}>현역 고3 시절</Chip></In>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 44}}>
        <In at={sc.s + 2.2}>{box('6월 모평까지', '4등급', th.mute === '#3A4770' ? '#8A97BD' : '#8C93A3', '항상 4등급 이하')}</In>
        <div style={{width: 250, height: 120, position: 'relative'}}>
          <div style={{position: 'absolute', left: 0, top: 52, height: 16, width: 200 * arrowP, background: th.accent, borderRadius: 8}} />
          {arrowP > 0.95 ? <div style={{position: 'absolute', left: 190, top: 30, width: 0, height: 0, borderTop: '30px solid transparent', borderBottom: '30px solid transparent',
            borderLeft: `46px solid ${th.accent}`}} /> : null}
          <div style={{position: 'absolute', left: 0, top: -20, width: 240, textAlign: 'center', fontSize: 30, fontWeight: 800, color: th.accent, opacity: arrowP}}>이 영상의 공부법</div>
        </div>
        <div style={{transform: `scale(${0.7 + 0.3 * one})`, opacity: Math.min(1, one * 1.5), position: 'relative'}}>
          {box('그해 수능', '1등급', th.accent2, '역전!')}
          {look === 'B' && one > 0.5 ? <svg width={520} height={300} style={{position: 'absolute', left: -50, top: 60}} viewBox="0 0 520 300">
            <ellipse cx={260} cy={150} rx={230} ry={115} fill="none" stroke="#E0453A" strokeWidth={7}
              strokeDasharray={1200} strokeDashoffset={1200 * (1 - Math.min(1, (one - 0.5) * 2))} transform="rotate(-6 260 150)" /></svg> : null}
        </div>
      </div>
    </div>);
};

const Career: React.FC<{look: Look; sc: Extract<Scene, {kind: 'career'}>}> = ({look, sc}) => {
  const th = TH[look];
  const {t} = useT();
  const years = Math.round(interpolate(t, [sc.s + 2.2, sc.s + 3.4], [0, 13], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const grades = ['1', '2', '1', '1', '2', '1', '1', '2', '1', '1', '1', '2'];
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 40}}>
      <In at={sc.s + 0.6}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 26}}>
          <span style={{fontSize: 48, fontWeight: 800, color: th.sub}}>온·오프라인</span>
          <Head look={look} size={130} color={th.accent}><span style={{fontVariantNumeric: 'tabular-nums'}}>{years}</span>년째</Head>
          <span style={{fontSize: 48, fontWeight: 800, color: th.sub}}>가르치는 중</span>
        </div>
      </In>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 170px)', gap: 22}}>
        {grades.map((g, i) => (
          <In key={i} at={sc.gridAt + i * 0.12} dy={20}>
            <div style={{height: 150, borderRadius: look === 'B' ? 8 : 24, background: th.card, boxShadow: th.cardShadow,
              border: look === 'B' ? '3px solid #1B1B1B' : look === 'C' ? '2px solid rgba(255,255,255,0.12)' : undefined,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontSize: 26, fontWeight: 700, color: th.sub}}>노베이스</div>
              <div style={{fontSize: 54, fontWeight: 900, color: t >= sc.resultAt ? (g === '1' ? th.accent2 : th.accent) : th.mute}}>{t >= sc.resultAt ? `${g}등급` : '?'}</div>
            </div>
          </In>))}
      </div>
      <In at={sc.resultAt}><div style={{fontSize: 52, fontWeight: 800, color: th.ink}}>
        수많은 노베이스 → <Swipe at={sc.resultAt + 0.3} color={look === 'C' ? '#FFD84D' : look === 'B' ? '#FFE266' : th.accent2} look={look}>수능 1·2등급</Swipe></div></In>
    </div>);
};

const Roadmap: React.FC<{look: Look; sc: Extract<Scene, {kind: 'roadmap'}>}> = ({look, sc}) => {
  const th = TH[look];
  const steps = ['단어', '독해', '어법', '문제풀이'];
  return (
    <div>
      <In at={sc.s + 0.2}><Head look={look} size={84}>본론 <span style={{color: th.accent}}>4단계</span></Head></In>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 56}}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <In at={sc.s + 0.6 + i * 0.25}>
              <div style={{width: 250, height: 200, borderRadius: look === 'B' ? 10 : 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: i === sc.active ? th.accent : th.card, color: i === sc.active ? '#fff' : th.ink, boxShadow: th.cardShadow,
                border: look === 'B' ? '3px solid #1B1B1B' : look === 'C' && i !== sc.active ? '2px solid rgba(255,255,255,0.12)' : undefined}}>
                <div style={{fontSize: 30, fontWeight: 800, opacity: 0.7}}>STEP {i + 1}</div>
                <div style={{fontSize: s.length > 3 ? 50 : 62, fontWeight: 900}}>{s}</div>
              </div>
            </In>
            {i < steps.length - 1 ? <In at={sc.s + 0.75 + i * 0.25}><div style={{fontSize: 50, fontWeight: 900, color: th.mute}}>›</div></In> : null}
          </React.Fragment>))}
      </div>
    </div>);
};

/* ---------------- face circle ---------------- */
const Face: React.FC<{video: string; look: Look; crop: Crop}> = ({video, look, crop}) => {
  const th = TH[look];
  const d = CIRCLE.d;
  const ring = look === 'B' ? 7 : 10;
  const k = (d - 2 * ring) / crop.size;
  return (
    <div style={{position: 'absolute', right: CIRCLE.right, bottom: CIRCLE.bottom, width: d, height: d}}>
      {look === 'C' ? <div style={{position: 'absolute', inset: -26, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,155,255,0.35) 55%, transparent 72%)'}} /> : null}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box', border: `${ring}px solid ${th.ring}`,
        boxShadow: look === 'A' ? '0 20px 50px rgba(20,30,60,0.28)' : undefined, background: '#222'}}>
        <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', width: SRC_W * k, height: SRC_H * k, left: -crop.x * k, top: -crop.y * k}} />
      </div>
    </div>);
};

export const YT1: React.FC<YT1Props> = ({video, look, crop, scenes}) => {
  const {t} = useT();
  const th = TH[look];
  let idx = 0;
  scenes.forEach((s, i) => { if (t >= s.s) idx = i; });
  const sc = scenes[idx];
  const body = (() => {
    switch (sc.kind) {
      case 'hook': return <Hook look={look} sc={sc} />;
      case 'who': return <Who look={look} sc={sc} />;
      case 'insta': return <Insta look={look} sc={sc} />;
      case 'grade': return <Grade look={look} sc={sc} />;
      case 'career': return <Career look={look} sc={sc} />;
      case 'roadmap': return <Roadmap look={look} sc={sc} />;
    }
  })();
  return (
    <AbsoluteFill style={{...th.bg, fontFamily: FONT}}>
      {/* brand mark top-left */}
      <div style={{position: 'absolute', left: 56, top: 44, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 30,
        color: look === 'C' ? '#CFE0FF' : '#2B63D9'}}>
        <div style={{width: 18, height: 18, borderRadius: '50%', background: look === 'C' ? '#6E9BFF' : '#2B63D9'}} />누보영어</div>
      <div key={idx} style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>{body}</div>
      <Face video={video} look={look} crop={crop} />
    </AbsoluteFill>);
};
