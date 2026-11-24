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
  <span style={{background: INK, color: '#fff', fontWeight: 900, fontSize: 30, padding: '6px 16px', borderRadius: 6, letterSpacing: 0.5, whiteSpace: 'nowrap', flexShrink: 0}}>{children}</span>);
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

// D — 5회독 플랜 (체크리스트형)
const D = () => {
  const plan: [number, string, number][] = [[1, '100개', 20], [2, '200개', 10], [3, '400개', 5], [4, '700개', 3], [5, '1,000개', 2]];
  return (
    <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
      <div style={{position: 'absolute', left: 110, top: 80, width: 1250}}>
        <Tag>2,000단어 기준</Tag>
        <div style={{fontSize: 100, fontWeight: 900, letterSpacing: -3, marginTop: 14}}>한 단어장 <HL>5회독</HL> 필수</div>
        <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20}}>
          {plan.map(([n, per, d]) => (
            <div key={n} style={{display: 'flex', alignItems: 'center', gap: 22}}>
              <Step>{n}회독</Step>
              <Pill w={290} fill={n === 1}>하루 {per}</Pill>
              <Arrow w={80} />
              <div style={{display: 'flex', gap: 6}}>{Array.from({length: 20}).map((_, i) => (
                <div key={i} style={{width: 15, height: 34, borderRadius: 4, background: i < d ? (n === 1 ? BLUE : '#9DB8FF') : '#EEF1F6'}} />))}</div>
              <div style={{fontSize: 48, fontWeight: 900, width: 110, whiteSpace: 'nowrap', flexShrink: 0}}>{d}일</div>
              {n === 1 ? <span style={{fontSize: 30, fontWeight: 900, color: RED, whiteSpace: 'nowrap'}}>← 제일 중요</span> : <Check />}
            </div>))}
        </div>
        <div style={{marginTop: 40, display: 'flex', alignItems: 'center', gap: 20, fontSize: 42, fontWeight: 900}}>
          <Mark plus />아는 단어는 넘기고 모르는 단어만 → <HL>6주면 5회독 끝</HL></div>
      </div>
      <Face />
    </AbsoluteFill>);
};

// E — 쌤 단어장 구성 (실제 단어장 캡처 + 번호 콜아웃)
const E = () => {
  const W = 1240, k = W / 1992;
  const box = (x: number, y: number, w: number, h: number, c: string) => (
    <div style={{position: 'absolute', left: x * k - 6, top: y * k - 4, width: w * k + 12, height: h * k + 8, border: `5px solid ${c}`, borderRadius: 10}} />);
  const num = (n: number, c: string) => (
    <span style={{display: 'inline-flex', width: 50, height: 50, borderRadius: '50%', background: c, color: '#fff', fontSize: 30, fontWeight: 900, alignItems: 'center', justifyContent: 'center'}}>{n}</span>);
  return (
    <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
      <div style={{position: 'absolute', left: 110, top: 80, width: 1260}}>
        <Tag>시중 단어장도 이 구성대로!</Tag>
        <div style={{fontSize: 96, fontWeight: 900, letterSpacing: -3, marginTop: 14}}>쌤 단어장 <HL>구성</HL></div>
        <div style={{position: 'relative', width: W, height: 280 * k, marginTop: 40, background: '#fff', border: `3px solid ${INK}`, borderRadius: 12, overflow: 'hidden'}}>
          <Img src={staticFile('yt1/entry_perpetual.png')} style={{width: W}} />
          {box(610, 36, 280, 42, '#F2B600')}{box(610, 96, 820, 44, BLUE)}{box(166, 12, 176, 38, RED)}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 26, marginTop: 44}}>
          {([[1, '#F2B600', '대표뜻', '고3 시험에 나오는 뜻 위주로'], [2, BLUE, '뉘앙스', '어떤 느낌인지 이해하고 넘어가기'], [3, RED, '체크칸 5개', '한 번 볼 때마다 하나씩 체크']] as [number, string, string, string][]).map(([n, c, t, d]) => (
            <div key={n} style={{display: 'flex', alignItems: 'center', gap: 22}}>
              {num(n, c)}<div style={{fontSize: 46, fontWeight: 900, width: 260}}>{t}</div><Arrow w={70} /><div style={{fontSize: 38, fontWeight: 700}}>{d}</div></div>))}
        </div>
      </div>
      <Face />
    </AbsoluteFill>);
};

// F — 시중 단어장 vs 쌤 단어장 (비교 도식형)
const F = () => (
  <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
    <div style={{position: 'absolute', left: 110, top: 90, width: 1250}}>
      <div style={{fontSize: 92, fontWeight: 900, letterSpacing: -3}}>단어장, <HL>뭐가 다를까?</HL></div>
      <div style={{display: 'flex', gap: 40, marginTop: 56}}>
        {([[false, '시중 단어장', [['address', '주소, 연설하다, 다루다'], ['issue', '문제, 발행하다, 쟁점']], '한글 뜻만 쭉 나열'], [true, '쌤 단어장', [['address', '대표뜻 + 뉘앙스'], ['issue', '대표뜻 + 뉘앙스']], '뉘앙스로 이해 → 장기기억']] as [boolean, string, [string, string][], string][]).map(([good, t, rs, foot], i) => (
          <div key={i} style={{flex: 1, background: '#fff', border: `4px solid ${good ? BLUE : '#C9CED8'}`, borderRadius: 20, padding: '30px 34px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}><Mark plus={good} /><div style={{fontSize: 46, fontWeight: 900}}>{t}</div></div>
            <div style={{marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16}}>
              {rs.map(([en, ko], j) => (
                <div key={j} style={{display: 'flex', alignItems: 'baseline', gap: 20, borderBottom: '2px dashed #DDE2EA', paddingBottom: 12}}>
                  <span style={{fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 40, width: 170}}>{en}</span>
                  <span style={{fontSize: 34, fontWeight: 700, color: good ? BLUE : '#7A808A'}}>{ko}</span></div>))}
            </div>
            <div style={{marginTop: 24, fontSize: 36, fontWeight: 900, color: good ? INK : RED}}>{good ? <HL>{foot}</HL> : foot}</div>
          </div>))}
      </div>
    </div>
    <Face />
  </AbsoluteFill>);

// G — 누보 영단어 분석기 시연 (실제 화면 + 빨리감기 표시)
const G = () => (
  <AbsoluteFill style={{...grid, fontFamily: FONT, color: INK}}>
    <div style={{position: 'absolute', left: 110, top: 70, width: 1250}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <Step>STEP 1</Step><div style={{fontSize: 44, fontWeight: 900}}>단어 입력</div><Arrow w={70} />
        <Step>STEP 2</Step><div style={{fontSize: 44, fontWeight: 900}}><HL>뉘앙스 · 뜻 · 예문</HL> 정리</div>
      </div>
      <div style={{position: 'relative', marginTop: 30, width: 1100, border: `4px solid ${INK}`, borderRadius: 16, overflow: 'hidden', background: '#fff'}}>
        <div style={{height: 46, background: '#F1F3F7', borderBottom: `3px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{width: 16, height: 16, borderRadius: '50%', background: c}} />)}
          <span style={{marginLeft: 14, fontSize: 24, fontWeight: 800}}>누보 영단어 분석기</span></div>
        <Img src={staticFile('yt1/demo_frame.jpg')} style={{width: 1100, height: 720, objectFit: 'cover', objectPosition: 'top'}} />
        <div style={{position: 'absolute', right: 20, top: 66, background: INK, color: '#fff', fontWeight: 900, fontSize: 30, padding: '8px 18px', borderRadius: 8}}>▶▶ 빠르게</div>
      </div>
      <div style={{position: 'absolute', left: 820, top: 860, background: YEL, fontWeight: 900, fontSize: 32, padding: '8px 18px', borderRadius: 6, border: `3px solid ${INK}`}}>📌 링크는 고정 댓글</div>
    </div>
    <Face />
  </AbsoluteFill>);

const V = {A, B, C, D, E, F, G};
export const Ref2: React.FC<{v: keyof typeof V}> = ({v}) => { const X = V[v]; return <X />; };
