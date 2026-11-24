import React from 'react';
import {AbsoluteFill, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** rp9 full long-form edit, look B: video (1440x810) + navy roadmap sidebar + caption band. No camera motion. */
type Line = {s: number; e: number; text: string};
type State = {s: number; step: number; sub: number; recap: number};
type Card = {s: number; e: number; label: string; text: string};
type Chapter = {s: number; e: number; tag: string; title: string};
type Patch = {s: number; e: number; x0: number; x1: number; c: string};
export type Rp9Props = {video: string; lines: Line[]; states: State[]; cards: Card[]; chapters: Chapter[]; patches: Patch[]};
const BLUE = '#2352E8', NAVY = '#0E1A3B', YEL = '#FFD84D';
const K = 1440 / 1280;
const STEPS = [
  {t: '내용 숙지', subs: ['한글 해석 먼저 읽고 요약', '영어 지문과 맞춰 보기', '같은 부분 영어에도 형광펜', '요약 어려우면 챗GPT']},
  {t: '변형 문제로 공부', subs: ['변형 문제 구하기', '풀지 말고 내 자료에 표시', '정답·오답 포인트 ★']},
  {t: '서술형 대비', subs: ['단어·어법 채우기, 영작', '선생님 강조 포인트 암기', '문장 덩어리로 끊어 암기']},
];
const rows = (t: string, key: string) => t.split('\n').map((r, i) => (
  <div key={i}>{r.split(/(\{[^}]+\})/).filter(Boolean).map((p, j) => p.startsWith('{') ? <span key={j} style={{color: key}}>{p.slice(1, -1)}</span> : <React.Fragment key={j}>{p}</React.Fragment>)}</div>));
const em = (s: string) => [...s.replace(/[{}]/g, '')].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);

export const Rp9Long: React.FC<Rp9Props> = ({video, lines, states, cards, chapters, patches}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const l = lines.find((x) => t >= x.s && t < x.e);
  const st = [...states].reverse().find((x) => t >= x.s) ?? states[0];
  const card = cards.find((c) => t >= c.s && t < c.e);
  const ch = chapters.find((c) => t >= c.s && t < c.e);
  const pops = (s: number) => spring({frame: f - Math.round(s * fps), fps, config: {damping: 14, stiffness: 170}});
  const kc = card ? pops(card.s) : 0;
  const kh = ch ? pops(ch.s) : 0;
  const chOut = ch ? Math.min(1, (ch.e - t) / 0.3) : 0;
  const recap = st.step === 4;
  return (
    <AbsoluteFill style={{background: '#F4F6FB', fontFamily: FONT}}>
      <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', left: 0, top: 0, width: 1440, height: 810}} />
      {/* cover the burned-in caption */}
      {patches.filter((p) => t >= p.s && t < p.e).map((p, i) => (
        <div key={i} style={{position: 'absolute', left: p.x0 * K, top: 565 * K, width: (p.x1 - p.x0) * K, height: 116 * K, background: p.c, borderRadius: 14}} />))}
      {/* chapter card */}
      {ch ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: 1440, height: 810, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `rgba(14,26,59,${0.45 * Math.min(1, kh) * chOut})`}}>
          <div style={{background: '#fff', borderRadius: 36, padding: '46px 90px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            transform: `scale(${0.8 + 0.2 * kh})`, opacity: Math.min(1, kh) * chOut, borderBottom: `16px solid ${BLUE}`}}>
            <div style={{display: 'inline-block', background: NAVY, color: YEL, fontWeight: 800, fontSize: 44, padding: '8px 34px', borderRadius: 999, marginBottom: 22}}>{ch.tag}</div>
            <div style={{fontFamily: DISPLAY.heavy, fontSize: 120, color: '#111', lineHeight: 1.1}}>{ch.title}</div>
          </div>
        </div>) : null}
      {/* sidebar roadmap */}
      <div style={{position: 'absolute', left: 1440, top: 0, width: 480, height: 1080, background: NAVY, color: '#fff', padding: '50px 36px'}}>
        <div style={{fontFamily: DISPLAY.heavy, fontSize: 46, lineHeight: 1.2, marginBottom: 40}}>
          {recap ? <>오늘 배운<br /><span style={{color: YEL}}>벼락치기</span> 3단계</> : <>내신 역전<br /><span style={{color: YEL}}>벼락치기</span> 3단계</>}</div>
        {STEPS.map((s, i) => {
          const on = recap ? st.recap === i + 1 : i + 1 === st.step, done = recap || i + 1 < st.step;
          return (
            <div key={i} style={{marginBottom: 30, opacity: on || (recap && st.recap === 0) ? 1 : st.step === 0 ? 0.8 : 0.45}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16, fontWeight: 800, fontSize: 38, color: on && recap ? YEL : '#fff'}}>
                <div style={{width: 54, height: 54, borderRadius: '50%', background: on ? YEL : done ? '#7FA2FF' : 'transparent', border: '3px solid #7FA2FF', flexShrink: 0,
                  color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30}}>{done && !on ? '✓' : i + 1}</div>{s.t}</div>
              {on && !recap ? s.subs.map((u, j) => <div key={j} style={{marginLeft: 70, marginTop: 12, fontSize: 28, fontWeight: j === st.sub ? 800 : 500,
                color: j === st.sub ? YEL : j < st.sub ? '#9FB2E8' : '#C9D3F2'}}>{j === st.sub ? '▶ ' : j < st.sub ? '✓ ' : '· '}{u}</div>) : null}
            </div>);
        })}
        {card ? (
          <div style={{position: 'absolute', left: 30, right: 30, bottom: 40, background: '#fff', borderRadius: 26, padding: '26px 28px 30px', color: '#111',
            transform: `scale(${0.85 + 0.15 * kc})`, opacity: Math.min(1, kc), borderTop: `12px solid ${YEL}`, boxShadow: '0 16px 40px rgba(0,0,0,0.35)'}}>
            <div style={{display: 'inline-block', background: BLUE, color: '#fff', fontWeight: 800, fontSize: 26, padding: '6px 18px', borderRadius: 999, marginBottom: 14}}>{card.label}</div>
            <div style={{fontFamily: DISPLAY.heavy, fontSize: Math.min(46, 390 / Math.max(...card.text.split('\n').map(em))), lineHeight: 1.3}}>{rows(card.text, BLUE)}</div>
          </div>) : null}
      </div>
      {/* caption band */}
      <div style={{position: 'absolute', left: 0, top: 810, width: 1440, height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '2px solid #DDE3F0'}}>
        {l ? <div style={{fontWeight: 800, fontSize: Math.min(64, 1340 / em(l.text)), color: '#111', letterSpacing: -1, textAlign: 'center', whiteSpace: 'nowrap'}}>{rows(l.text, BLUE)}</div> : null}
      </div>
      <div style={{position: 'absolute', left: 36, bottom: 26, fontWeight: 800, fontSize: 30, color: BLUE}}>누보영어</div>
    </AbsoluteFill>
  );
};
