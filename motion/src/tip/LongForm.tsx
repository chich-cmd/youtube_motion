import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * 16:9 long-form edit of a 1280x720 screen recording. Burned-in captions are covered by our own caption block.
 * look A: full-frame overlay (chapter chip, highlights, pop card)
 * look B: video + right roadmap sidebar + caption band under the video
 * look C: full-frame, lower-third caption bar + margin sticky note
 */
export type LFMark = {s: number; e: number; kind: 'hl' | 'box'; x: number; y: number; w: number; h: number; color?: string};
export type LFLine = {s: number; e: number; text: string};
export type LFProps = {video: string; look: 'A' | 'B' | 'C'; lines: LFLine[]; marks: LFMark[]; step: number; sub: number;
  card?: {s: number; e: number; label: string; text: string}; chapter?: string};
const BLUE = '#2352E8', NAVY = '#0E1A3B';
const SW = 1280, SH = 720;
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const STEPS = [{t: '내용 숙지', subs: ['한글 해석 먼저 읽고 요약', '영어 지문과 맞춰 보기', '같은 부분 형광펜']}, {t: '변형 문제로 공부', subs: ['풀지 말고 표시만', '정답·오답 포인트 ★']}, {t: '서술형 대비', subs: ['선생님 강조 포인트', '문장 덩어리로 암기']}];

export const LongForm: React.FC<LFProps> = ({video, look, lines, marks, step, sub, card, chapter}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  // video rectangle
  const V = look === 'B' ? {x: 0, y: 0, w: 1440, h: 810} : {x: 0, y: 0, w: 1920, h: 1080};
  const k = V.w / SW;
  const P = (x: number, y: number) => [V.x + x * k, V.y + y * k];
  const [cx0, cy0] = P(447, 573), cw = 385 * k, ch = 98 * k;     // burned caption box
  const kc = card ? spring({frame: f - Math.round(card.s * fps), fps, config: {damping: 14, stiffness: 170}}) : 0;
  return (
    <AbsoluteFill style={{background: look === 'B' ? '#F4F6FB' : '#fff', fontFamily: FONT}}>
      <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: V.x, top: V.y, width: V.w, height: V.h}} />
      {marks.filter((m) => t >= m.s && t < m.e).map((m, i) => {
        const [x, y] = P(m.x, m.y), p = interpolate(t, [m.s, m.s + 0.45], [0, 1], {extrapolateRight: 'clamp'});
        return m.kind === 'hl'
          ? <div key={i} style={{position: 'absolute', left: x, top: y, width: m.w * k * p, height: m.h * k, background: m.color ?? 'rgba(255,221,0,0.5)', mixBlendMode: 'multiply', borderRadius: 4}} />
          : <div key={i} style={{position: 'absolute', left: x - 6, top: y - 6, width: m.w * k + 12, height: m.h * k + 12, border: `5px solid ${m.color ?? BLUE}`, borderRadius: 12, opacity: p}} />;
      })}
      {/* cover the burned-in caption */}
      {look === 'B'
        ? <div style={{position: 'absolute', left: cx0 - 8, top: cy0 - 8, width: cw + 16, height: ch + 16, background: '#fff', borderRadius: 12}} />
        : null}
      {look === 'A' && l ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: cy0 - 14, height: ch + 28, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div style={{minWidth: cw + 40, minHeight: ch + 28, background: '#111', color: '#fff', borderRadius: 26, fontWeight: 800, fontSize: 58, letterSpacing: -1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 44px', whiteSpace: 'nowrap'}}>{rows(l.text, '#FFD84D')}</div>
        </div>) : null}
      {look === 'A' ? (
        <div style={{position: 'absolute', left: 36, top: 30, background: NAVY, color: '#fff', fontWeight: 800, fontSize: 36, padding: '10px 26px', borderRadius: 999}}>
          <span style={{color: '#7FA2FF', marginRight: 12}}>STEP {step}</span>{STEPS[step - 1].t}</div>) : null}
      {look === 'A' && card && t >= card.s && t < card.e ? (
        <div style={{position: 'absolute', right: 60, top: 140, width: 560, background: '#fff', borderRadius: 30, padding: '34px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          transform: `scale(${0.85 + 0.15 * kc})`, opacity: Math.min(1, kc), borderTop: `14px solid ${BLUE}`}}>
          <div style={{fontWeight: 800, fontSize: 32, color: BLUE, marginBottom: 14}}>{card.label}</div>
          <div style={{fontFamily: DISPLAY.heavy, fontSize: 54, lineHeight: 1.3, color: '#111'}}>{rows(card.text, BLUE)}</div>
        </div>) : null}
      {look === 'B' ? (<>
        <div style={{position: 'absolute', left: 1440, top: 0, width: 480, height: 1080, background: NAVY, color: '#fff', padding: '50px 36px'}}>
          <div style={{fontFamily: DISPLAY.heavy, fontSize: 46, lineHeight: 1.2, marginBottom: 40}}>내신 역전<br /><span style={{color: '#FFD84D'}}>벼락치기</span> 3단계</div>
          {STEPS.map((s, i) => {
            const on = i + 1 === step, done = i + 1 < step;
            return (
              <div key={i} style={{marginBottom: 34, opacity: on ? 1 : 0.45}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16, fontWeight: 800, fontSize: 38}}>
                  <div style={{width: 54, height: 54, borderRadius: '50%', background: on ? '#FFD84D' : done ? '#7FA2FF' : 'transparent', border: '3px solid #7FA2FF',
                    color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30}}>{done ? '✓' : i + 1}</div>{s.t}</div>
                {on ? s.subs.map((u, j) => <div key={j} style={{marginLeft: 70, marginTop: 12, fontSize: 29, fontWeight: j === sub ? 800 : 500,
                  color: j === sub ? '#FFD84D' : '#C9D3F2'}}>{j === sub ? '▶ ' : '· '}{u}</div>) : null}
              </div>);
          })}
        </div>
        <div style={{position: 'absolute', left: 0, top: 810, width: 1440, height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {l ? <div style={{fontWeight: 800, fontSize: 60, color: '#111', letterSpacing: -1, textAlign: 'center'}}>{rows(l.text, BLUE)}</div> : null}
        </div>
      </>) : null}
      {look === 'C' ? (<>
        <div style={{position: 'absolute', left: cx0 - 10, top: cy0 - 10, width: cw + 20, height: ch + 20, background: '#fff', borderRadius: 14}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'rgba(255,255,255,0.96)', borderTop: `6px solid ${BLUE}`,
          display: 'flex', alignItems: 'center', padding: '0 50px', gap: 30}}>
          <div style={{background: BLUE, color: '#fff', fontWeight: 800, fontSize: 32, padding: '10px 22px', borderRadius: 10, whiteSpace: 'nowrap'}}>STEP {step} · {STEPS[step - 1].t}</div>
          {l ? <div style={{fontWeight: 800, fontSize: 52, color: '#111', letterSpacing: -1, whiteSpace: 'nowrap'}}>{rows(l.text, BLUE)}</div> : null}
        </div>
        {card && t >= card.s && t < card.e ? (
          <div style={{position: 'absolute', right: 40, top: 60, width: 470, background: '#FFF3A6', padding: '30px 34px 36px', transform: `rotate(2deg) scale(${0.85 + 0.15 * kc})`,
            opacity: Math.min(1, kc), boxShadow: '0 16px 40px rgba(0,0,0,0.25)', borderTop: '30px solid #FFE266'}}>
            <div style={{fontFamily: DISPLAY.hand, fontSize: 44, color: '#E8352B'}}>{card.label}</div>
            <div style={{fontFamily: DISPLAY.hand, fontSize: 62, lineHeight: 1.1, color: '#111'}}>{rows(card.text, '#E8352B')}</div>
          </div>) : null}
      </>) : null}
      {chapter ? null : null}
    </AbsoluteFill>
  );
};
