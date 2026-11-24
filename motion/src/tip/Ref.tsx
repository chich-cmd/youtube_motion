import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT} from '../theme';
import '../fonts';

/** Clean style references (static) — same scene ("address" nuance) in 5 looks. Face circle bottom-right, black ring. */
export type RefStyle = 1 | 2 | 3 | 4 | 5;
const branches: [string, string][] = [['편지가 향하는 곳', '주소'], ['사람들을 향해 말하니까', '연설하다'], ['문제를 향해 손을 뻗으니까', '다루다']];

const Face: React.FC<{ring: string; shadow?: string}> = ({ring, shadow}) => (
  <div style={{position: 'absolute', right: 64, bottom: 56, width: 430, height: 430, borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box', border: `7px solid ${ring}`, boxShadow: shadow}}>
    <Img src={staticFile('yt1/face.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </div>);

// 1. 화이트 미니멀 — 흰 배경, 파랑 한 색, 여백 위주
const S1 = () => (
  <AbsoluteFill style={{background: '#FFFFFF', fontFamily: FONT, color: '#111'}}>
    <div style={{position: 'absolute', left: 120, top: 70, fontSize: 28, fontWeight: 700, color: '#9AA0AA', letterSpacing: 2}}>STEP 1 · 단어</div>
    <div style={{position: 'absolute', left: 120, top: 230}}>
      <div style={{fontSize: 120, fontWeight: 800, letterSpacing: -3}}>address</div>
      <div style={{fontSize: 56, fontWeight: 700, color: '#2B63D9', marginTop: 10}}>어딘가를 향한다</div>
      <div style={{width: 80, height: 4, background: '#111', margin: '60px 0 50px'}} />
      {branches.map(([w, m], i) => (
        <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 30, marginBottom: 26}}>
          <div style={{fontSize: 52, fontWeight: 800, width: 260}}>{m}</div>
          <div style={{fontSize: 36, fontWeight: 500, color: '#7A808A'}}>{w}</div>
        </div>))}
    </div>
    <Face ring="#111" />
  </AbsoluteFill>);

// 2. 다크 미니멀 — 짙은 남색, 흰 글씨, 노랑 포인트 하나
const S2 = () => (
  <AbsoluteFill style={{background: '#0F172A', fontFamily: FONT, color: '#fff'}}>
    <div style={{position: 'absolute', left: 120, top: 70, fontSize: 28, fontWeight: 700, color: '#64748B', letterSpacing: 2}}>STEP 1 · 단어</div>
    <div style={{position: 'absolute', left: 120, top: 220}}>
      <div style={{fontSize: 40, fontWeight: 600, color: '#94A3B8'}}>address의 뉘앙스</div>
      <div style={{fontSize: 110, fontWeight: 900, letterSpacing: -3, marginTop: 6}}><span style={{color: '#FACC15'}}>어딘가를</span> 향한다</div>
      <div style={{display: 'flex', gap: 28, marginTop: 90}}>
        {branches.map(([w, m], i) => (
          <div key={i} style={{width: 330, borderTop: '3px solid #334155', paddingTop: 26}}>
            <div style={{fontSize: 30, fontWeight: 500, color: '#94A3B8', marginBottom: 12}}>{w}</div>
            <div style={{fontSize: 56, fontWeight: 800}}>{m}</div>
          </div>))}
      </div>
    </div>
    <Face ring="#000" shadow="0 0 0 3px #334155" />
  </AbsoluteFill>);

// 3. 소프트 카드 — 연회색 배경 위 흰 카드 하나
const S3 = () => (
  <AbsoluteFill style={{background: '#F2F4F7', fontFamily: FONT, color: '#111'}}>
    <div style={{position: 'absolute', left: 100, top: 150, width: 1240, background: '#fff', borderRadius: 36, padding: '64px 72px', boxShadow: '0 30px 80px rgba(16,24,40,0.08)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <div style={{fontSize: 92, fontWeight: 800, letterSpacing: -2}}>address</div>
        <div style={{fontSize: 30, fontWeight: 700, color: '#2B63D9', background: '#EAF0FD', padding: '10px 22px', borderRadius: 999}}>뉘앙스 · 어딘가를 향한다</div>
      </div>
      <div style={{height: 2, background: '#EEF0F3', margin: '44px 0 36px'}} />
      {branches.map(([w, m], i) => (
        <div key={i} style={{display: 'flex', alignItems: 'center', padding: '22px 0', borderBottom: i < 2 ? '2px solid #F3F4F6' : undefined}}>
          <div style={{width: 64, height: 64, borderRadius: 20, background: '#F2F4F7', fontSize: 32, fontWeight: 800, color: '#667085', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 30}}>{i + 1}</div>
          <div style={{fontSize: 38, fontWeight: 500, color: '#667085', flex: 1}}>{w}</div>
          <div style={{fontSize: 52, fontWeight: 800}}>{m}</div>
        </div>))}
    </div>
    <Face ring="#111" shadow="0 20px 50px rgba(16,24,40,0.15)" />
  </AbsoluteFill>);

// 4. 에디토리얼 — 아이보리 배경, 큰 타이포, 가는 선, 번호
const S4 = () => (
  <AbsoluteFill style={{background: '#F7F4EE', fontFamily: FONT, color: '#1A1A1A'}}>
    <div style={{position: 'absolute', left: 120, right: 120, top: 70, display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 600, color: '#8A8478', borderBottom: '1.5px solid #1A1A1A', paddingBottom: 18}}>
      <span>01 — 단어</span><span>누보영어</span></div>
    <div style={{position: 'absolute', left: 120, top: 200}}>
      <div style={{fontSize: 150, fontWeight: 900, letterSpacing: -5, lineHeight: 1}}>address</div>
      <div style={{fontSize: 50, fontWeight: 500, marginTop: 24}}>= <b style={{fontWeight: 800, borderBottom: '6px solid #E0453A'}}>어딘가를 향한다</b></div>
      <div style={{marginTop: 70, width: 1100}}>
        {branches.map(([w, m], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', borderTop: '1.5px solid #CFC8BA', padding: '20px 0'}}>
            <div style={{fontSize: 28, fontWeight: 700, color: '#8A8478', width: 80}}>0{i + 1}</div>
            <div style={{fontSize: 48, fontWeight: 800, width: 280}}>{m}</div>
            <div style={{fontSize: 34, fontWeight: 500, color: '#6B655B'}}>{w}</div>
          </div>))}
      </div>
    </div>
    <Face ring="#1A1A1A" />
  </AbsoluteFill>);

// 5. 키노트 블루 — 단색 파랑 배경, 흰 큰 글씨
const S5 = () => (
  <AbsoluteFill style={{background: '#2B5BE0', fontFamily: FONT, color: '#fff'}}>
    <div style={{position: 'absolute', left: 120, top: 70, fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2}}>STEP 1 · 단어</div>
    <div style={{position: 'absolute', left: 120, top: 210}}>
      <div style={{display: 'inline-block', fontSize: 36, fontWeight: 700, background: '#fff', color: '#2B5BE0', padding: '10px 26px', borderRadius: 12}}>address</div>
      <div style={{fontSize: 120, fontWeight: 900, letterSpacing: -3, marginTop: 30}}>어딘가를 향한다</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 70}}>
        {branches.map(([w, m], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <div style={{fontSize: 36, fontWeight: 500, color: 'rgba(255,255,255,0.75)', width: 470}}>{w}</div>
            <div style={{fontSize: 36, color: 'rgba(255,255,255,0.5)'}}>→</div>
            <div style={{fontSize: 54, fontWeight: 800}}>{m}</div>
          </div>))}
      </div>
    </div>
    <Face ring="#000" />
  </AbsoluteFill>);

export const Ref: React.FC<{style: RefStyle}> = ({style}) => [<S1 />, <S2 />, <S3 />, <S4 />, <S5 />][style - 1];
