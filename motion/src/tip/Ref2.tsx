import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/** Static samples in the style of an infographic study channel: white grid paper, bold black titles with
 *  yellow highlighter, black STEP chips, blue outline pills, arrows, green check boxes, ⊕/⊖ markers. */
const INK = '#111', BLUE = '#2F6BFF', YEL = '#FFE14D', GREEN = '#22A45D', RED = '#F0443A';
const grid: React.CSSProperties = {backgroundColor: '#fff', backgroundImage: 'linear-gradient(#EDF1F7 2px, transparent 2px), linear-gradient(90deg, #EDF1F7 2px, transparent 2px)', backgroundSize: '44px 44px'};

const HL: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = YEL}) => (
  <span style={{background: `linear-gradient(transparent 52%, ${color} 52%, ${color} 92%, transparent 92%)`, padding: '0 6px'}}>{children}</span>);
const Step: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{background: INK, color: '#fff', fontWeight: 900, fontSize: 30, padding: '6px 16px', borderRadius: 6, letterSpacing: 0.5}}>{children}</span>);
const Pill: React.FC<{children: React.ReactNode; w?: number; fill?: boolean}> = ({children, w, fill}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, border: `4px solid ${BLUE}`, borderRadius: 14, padding: '10px 22px', fontWeight: 800, fontSize: 36,
    color: fill ? '#fff' : INK, background: fill ? BLUE : '#fff', width: w, boxSizing: 'border-box'}}>
    <span style={{width: 16, height: 16, borderRadius: '50%', background: fill ? '#fff' : BLUE, flexShrink: 0}} />{children}</div>);
const Arrow: React.FC<{w?: number}> = ({w = 110}) => (
  <svg width={w} height={30} viewBox={`0 0 ${w} 30`}><path d={`M4 15 H${w - 8} M${w - 22} 4 L${w - 6} 15 L${w - 22} 26`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Check = () => (
  <svg width={54} height={54} viewBox="0 0 54 54"><rect x={3} y={3} width={48} height={48} rx={8} fill="#fff" stroke={GREEN} strokeWidth={5} />
    <path d="M13 28 L23 38 L42 16" stroke={GREEN} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Mark: React.FC<{plus?: boolean}> = ({plus}) => (
  <span style={{display: 'inline-flex', width: 50, height: 50, borderRadius: '50%', border: `4px solid ${plus ? BLUE : RED}`, color: plus ? BLUE : RED,
    alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, lineHeight: 1}}>{plus ? '+' : '−'}</span>);
const En: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 48}}><HL>{children}</HL></span>);
const Face: React.FC = () => (
  <div style={{position: 'absolute', right: 56, bottom: 48, width: 320, height: 320, borderRadius: '50%', overflow: 'hidden', border: `6px solid ${INK}`, boxSizing: 'border-box'}}>
    <Img src={staticFile('yt1/face.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div>);
const Tag: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{background: YEL, color: INK, fontWeight: 900, fontSize: 28, padding: '4px 12px', borderRadius: 4}}>{children}</span>);

const rows: [string, string, string][] = [['편지가 향하는 곳', 'address', '주소'], ['사람들을 향해 말하니까', 'address', '연설하다'], ['문제를 향해 손을 뻗으니까', 'address', '다루다']];

// A — 체크리스트형 (레퍼런스의 "지시어·연결어 체크" 구성)
const A = () => (
  <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
    <div style={{position: 'absolute', left: 110, top: 80}}>
      <Tag>뜻이 3개라 헷갈린다면?</Tag>
      <div style={{fontSize: 108, fontWeight: 900, letterSpacing: -3, marginTop: 14}}><HL>address</HL> 뉘앙스 체크</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 30}}>
        <Step>핵심 뉘앙스</Step><div style={{fontSize: 50, fontWeight: 900, color: BLUE}}>어딘가를 향한다 →</div>
      </div>
      <div style={{marginTop: 46, display: 'flex', flexDirection: 'column', gap: 30}}>
        {rows.map(([why, , mean], i) => (
          <div key={i}>
            <div style={{fontSize: 28, fontWeight: 700, color: '#555', marginBottom: 8}}>{['편지', '사람들', '문제'][i]}를 향해</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <Pill w={560}>{why}</Pill><Arrow /><div style={{fontSize: 54, fontWeight: 900, width: 230}}><HL>{mean}</HL></div><Check />
            </div>
          </div>))}
      </div>
    </div>
    <Face />
  </AbsoluteFill>);

// B — 비교 도식형 (레퍼런스의 "STEP 1 / STEP 2 + ⊕⊖ 원" 구성)
const B = () => (
  <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
    <div style={{position: 'absolute', left: 110, top: 80, width: 1240}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}><Step>STEP 1</Step><div style={{fontSize: 46, fontWeight: 900}}>뜻만 외우면</div></div>
      <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 24, marginLeft: 20}}>
        <En>address</En><span style={{fontSize: 44, fontWeight: 900}}>=</span><Pill>주소</Pill>
        <span style={{fontSize: 40, fontWeight: 800, marginLeft: 20}}>He addressed the problem.</span><Mark />
      </div>
      <div style={{fontSize: 34, fontWeight: 700, color: RED, marginTop: 14, marginLeft: 20}}>"그가 주소했다 문제를" → 말이 안 됨</div>
      <div style={{height: 3, background: INK, margin: '40px 0'}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}><Step>STEP 2</Step><div style={{fontSize: 46, fontWeight: 900}}>뉘앙스로 보면</div></div>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, marginTop: 34, marginLeft: 20}}>
        <div style={{width: 250, height: 250, borderRadius: '50%', border: `5px solid ${BLUE}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff'}}>
          <En>address</En><div style={{fontSize: 32, fontWeight: 900, color: BLUE, marginTop: 6}}>어딘가를<br />향한다</div></div>
        <svg width={120} height={260} viewBox="0 0 120 260">{[40, 130, 220].map((y, i) => <path key={i} d={`M6 130 C60 130 50 ${y} 110 ${y}`} stroke={INK} strokeWidth={5} fill="none" />)}</svg>
        <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
          {rows.map(([why, , mean], i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18}}>
              <Mark plus /><div style={{fontSize: 34, fontWeight: 700, width: 420}}>{why}</div><div style={{fontSize: 50, fontWeight: 900}}><HL>{mean}</HL></div></div>))}
        </div>
      </div>
    </div>
    <Face />
  </AbsoluteFill>);

// C — 좌우 분할형 (레퍼런스 레이아웃 그대로: 왼쪽 인물 / 오른쪽 패널) — 원형 대신 쓰는 옵션
const C = () => (
  <AbsoluteFill style={{background: '#000', fontFamily: FONT, color: INK}}>
    <Img src={staticFile('yt1/face_tall.jpg')} style={{position: 'absolute', left: 0, top: 0, width: 900, height: 1080, objectFit: 'cover'}} />
    <div style={{position: 'absolute', left: 900, top: 0, width: 1020, height: 1080, ...grid, padding: '70px 60px', boxSizing: 'border-box'}}>
      <Tag>단어 = 한글 뜻 + 뉘앙스</Tag>
      <div style={{fontSize: 92, fontWeight: 900, letterSpacing: -3, marginTop: 14}}><HL>address</HL></div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 20}}><Step>뉘앙스</Step><div style={{fontSize: 44, fontWeight: 900, color: BLUE}}>어딘가를 향한다</div></div>
      <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 34}}>
        {rows.map(([why, , mean], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <Pill w={470}>{why}</Pill><Arrow w={70} /><div style={{fontSize: 50, fontWeight: 900, width: 200}}><HL>{mean}</HL></div><Check /></div>))}
      </div>
      <div style={{marginTop: 60, fontSize: 36, fontWeight: 800}}>다른 뜻 3개? → <span style={{color: BLUE}}>뉘앙스 하나로 이해!</span></div>
    </div>
  </AbsoluteFill>);

export const Ref2: React.FC<{v: 'A' | 'B' | 'C'}> = ({v}) => (v === 'A' ? <A /> : v === 'B' ? <B /> : <C />);
