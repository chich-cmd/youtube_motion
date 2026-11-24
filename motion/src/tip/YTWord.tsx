import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {DISPLAY} from '../fonts';
import '../fonts';

/**
 * YouTube long-form 1 — "단어" section. Look B (notebook grid + highlighter), chosen by the user.
 * Face cam: circle bottom-right, plain black ring. No captions (the editor adds them).
 * Camera never moves; elements fade/slide in once per scene.
 * All times are seconds on the cut timeline (see yt1/README.md for the cut list).
 */
export type Crop = {s: number; x: number; y: number; size: number};
export type WScene = {kind: string; s: number; at: number[]};
export type YTWordProps = {video: string; crops: Crop[]; scenes: WScene[]};

const SRC_W = 1440, SRC_H = 1080;
const CIRCLE = {d: 430, right: 64, bottom: 56, ring: 7};
const BOX = {x: 110, y: 96, w: 1250, h: 900};
const INK = '#1B1B1B', SUB = '#4A4A4A', BLUE = '#2B63D9', RED = '#E0453A', YEL = '#FFE266', GRAY = '#BDBDBD', SKY = '#BFE3FF', PINK = '#FFC9D6';

const useT = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return {f, fps, t: f / fps}; };
const usePop = (at: number) => { const {f, fps} = useT(); return spring({frame: f - Math.round(at * fps), fps, config: {damping: 16, stiffness: 160}}); };
const prog = (t: number, a: number, d = 0.5) => interpolate(t, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

const In: React.FC<{at: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, dy = 26, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * dy}px)`, ...style}}>{children}</div>;
};
const Pop: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: Math.min(1, k * 1.5), transform: `scale(${0.6 + 0.4 * k})`, ...style}}>{children}</div>;
};
/** highlighter swipe behind text (same content = same colour) */
const HL: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = YEL, children}) => {
  const {t} = useT();
  const p = prog(t, at);
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span style={{position: 'absolute', left: -8, bottom: '4%', height: '48%', width: `calc(${p * 100}% + 16px)`, background: color, opacity: 0.8, borderRadius: 6, transform: 'rotate(-1deg)'}} />
      <span style={{position: 'relative'}}>{children}</span>
    </span>);
};
const Hand: React.FC<{size: number; color?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({size, color = INK, style, children}) =>
  <div style={{fontFamily: DISPLAY.hand, fontSize: size, color, lineHeight: 1.1, ...style}}>{children}</div>;
const Chip: React.FC<{bg?: string; color?: string; size?: number; children: React.ReactNode}> = ({bg = YEL, color = INK, size = 36, children}) =>
  <span style={{display: 'inline-block', background: bg, color, fontWeight: 800, fontSize: size, padding: '10px 26px', borderRadius: 8, border: `3px solid ${INK}`, transform: 'rotate(-1.5deg)'}}>{children}</span>;
const Card: React.FC<{style?: React.CSSProperties; children: React.ReactNode}> = ({style, children}) =>
  <div style={{background: '#fff', borderRadius: 10, border: `3px solid ${INK}`, boxShadow: '0 10px 0 rgba(0,0,0,0.06)', padding: '36px 44px', ...style}}>{children}</div>;
/** hand-drawn red X */
const Cross: React.FC<{at: number; size?: number; style?: React.CSSProperties}> = ({at, size = 120, style}) => {
  const {t} = useT();
  const a = prog(t, at, 0.25), b = prog(t, at + 0.2, 0.25);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <path d="M15 15 L85 85" stroke={RED} strokeWidth={11} strokeLinecap="round" fill="none" strokeDasharray={100} strokeDashoffset={100 * (1 - a)} />
      <path d="M85 15 L15 85" stroke={RED} strokeWidth={11} strokeLinecap="round" fill="none" strokeDasharray={100} strokeDashoffset={100 * (1 - b)} />
    </svg>);
};
const Strike: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const {t} = useT();
  const p = prog(t, at, 0.4);
  return <span style={{position: 'relative', display: 'inline-block'}}>{children}
    <span style={{position: 'absolute', left: -6, top: '52%', height: 8, width: `calc(${p * 100}% + 12px)`, background: RED, borderRadius: 4, transform: 'rotate(-2deg)'}} /></span>;
};
const Arrow: React.FC<{at: number; w?: number; color?: string}> = ({at, w = 90, color = INK}) => {
  const {t} = useT();
  const p = prog(t, at, 0.4);
  return (
    <svg width={w} height={40} viewBox={`0 0 ${w} 40`} style={{flexShrink: 0}}>
      <path d={`M4 20 L${w - 10} 20 M${w - 26} 6 L${w - 8} 20 L${w - 26} 34`} stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={w * 1.6} strokeDashoffset={w * 1.6 * (1 - p)} />
    </svg>);
};

/* ---------------- scenes ---------------- */
type SP = {s: number; at: number[]};

const Chapter: React.FC<SP & {n: number; title: string; sub?: string}> = ({s, n, title, sub}) => (
  <div>
    <In at={s + 0.1}><Chip bg={BLUE} color="#fff" size={40}>STEP {n}</Chip></In>
    <In at={s + 0.35} style={{marginTop: 30}}><Hand size={190}>{title}</Hand></In>
    {sub ? <In at={s + 0.8} style={{marginTop: 20}}><div style={{fontSize: 48, fontWeight: 800, color: SUB}}>{sub}</div></In> : null}
  </div>);

// 노베이스 단어 공부: 영어=한글 짝짓기 → 까먹고 적용 X
const Pairs: React.FC<SP> = ({s, at: [address, issue, done, forget, apply, why]}) => {
  const row = (a: number, en: string, ko: string) => (
    <In at={a}><Card style={{display: 'flex', alignItems: 'center', gap: 34, padding: '26px 44px', width: 620}}>
      <div style={{fontSize: 64, fontWeight: 900, color: INK, width: 250}}>{en}</div>
      <div style={{fontSize: 52, fontWeight: 900, color: GRAY}}>=</div>
      <div style={{fontSize: 60, fontWeight: 800, color: INK}}>{ko}</div>
    </Card></In>);
  return (
    <div>
      <In at={s + 0.2}><div style={{fontSize: 44, fontWeight: 800, color: SUB, marginBottom: 30}}>노베이스 단어 공부, 거의 다 이렇게 해요</div></In>
      <div style={{display: 'flex', gap: 60, alignItems: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>{row(address, 'address', '주소')}{row(issue, 'issue', '문제')}</div>
        <Pop at={done}><div style={{border: `6px solid ${RED}`, color: RED, borderRadius: 14, padding: '6px 30px', fontFamily: DISPLAY.hand, fontSize: 96, transform: 'rotate(-8deg)'}}>끝!</div></Pop>
      </div>
      <div style={{display: 'flex', gap: 26, marginTop: 50}}>
        <In at={forget}><Chip bg={PINK}>금방 까먹음</Chip></In>
        <In at={apply}><Chip bg={PINK}>해석에 적용 안 됨</Chip></In>
        <In at={why}><Hand size={84} color={RED} style={{marginLeft: 20}}>왜 그럴까?</Hand></In>
      </div>
    </div>);
};

// He addressed the problem. → 그가 주소했다 문제를 ✗
const Sentence: React.FC<SP> = ({s, at: [en, ko, nope]}) => (
  <div>
    <In at={s + 0.3}><Chip>address = 주소 만 외웠다면?</Chip></In>
    <In at={en} style={{marginTop: 50}}><Card style={{padding: '40px 50px'}}>
      <div style={{fontSize: 84, fontWeight: 800, color: INK, letterSpacing: -1}}>He <HL at={en + 0.4}>addressed</HL> the problem.</div>
    </Card></In>
    <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 40}}>
      <In at={ko}><div style={{fontSize: 70, fontWeight: 800, color: SUB}}>그가 <Strike at={nope}>주소했다</Strike> 문제를</div></In>
      <Pop at={nope + 0.3}><Hand size={96} color={RED}>???</Hand></Pop>
    </div>
  </div>);

// 단어 = 한글 뜻 + 뉘앙스
const Formula: React.FC<SP> = ({s, at: [meaning, nuance]}) => (
  <div>
    <In at={s + 0.2}><div style={{fontSize: 46, fontWeight: 800, color: SUB, marginBottom: 40}}>단어는 이렇게 알아야 해요</div></In>
    <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
      <In at={s + 0.6}><Card style={{padding: '30px 46px'}}><Hand size={120}>단어</Hand></Card></In>
      <In at={s + 0.9}><Hand size={110} color={GRAY}>=</Hand></In>
      <In at={meaning}><Card style={{padding: '30px 46px'}}><Hand size={120}>한글 뜻</Hand></Card></In>
      <In at={nuance - 0.2}><Hand size={110} color={GRAY}>+</Hand></In>
      <Pop at={nuance}><Card style={{padding: '30px 46px', background: YEL}}><Hand size={120} color={RED}>뉘앙스</Hand></Card></Pop>
    </div>
  </div>);

// 뉘앙스 트리: 단어 → 핵심 뉘앙스 → 뜻 갈래
const Tree: React.FC<SP & {word: string; core: string; branches: [string, string][]; foot?: [string, string]}> = ({s, at, word, core, branches, foot}) => {
  const [coreAt, ...rest] = at;
  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
        <In at={s + 0.2}><Card style={{padding: '22px 40px'}}><div style={{fontSize: 76, fontWeight: 900}}>{word}</div></Card></In>
        <Arrow at={coreAt - 0.3} />
        <Pop at={coreAt}><div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <Chip bg="#D9D9D9" size={30}>뉘앙스</Chip><Hand size={104}><HL at={coreAt + 0.4}>{core}</HL></Hand></div></Pop>
      </div>
      <div style={{marginTop: 44, marginLeft: 60, display: 'flex', flexDirection: 'column', gap: 22, borderLeft: `5px dashed ${GRAY}`, paddingLeft: 40}}>
        {branches.map(([why, mean], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24}}>
            <In at={rest[i * 2]}><div style={{fontSize: 46, fontWeight: 700, color: SUB, whiteSpace: 'nowrap'}}>{why}</div></In>
            <Arrow at={rest[i * 2 + 1] - 0.3} w={70} color={BLUE} />
            <Pop at={rest[i * 2 + 1]}><div style={{fontSize: 60, fontWeight: 900, color: BLUE, whiteSpace: 'nowrap'}}>{mean}</div></Pop>
          </div>))}
      </div>
      {foot ? <In at={rest[branches.length * 2]} style={{marginTop: 46}}>
        <div style={{display: 'flex', gap: 22, alignItems: 'center'}}><Chip>{foot[0]}</Chip>{foot[1] ? <In at={rest[branches.length * 2 + 1]}><Chip>{foot[1]}</Chip></In> : null}</div>
      </In> : null}
    </div>);
};

// 시중 단어장: 한글 뜻만 나열
const Market: React.FC<SP> = ({s, at: [list, onlyKo, noNuance]}) => {
  const rows: [string, string][] = [['address', '주소, 연설하다, 다루다'], ['issue', '문제, 발행하다, 쟁점'], ['provide', '제공하다, 공급하다'], ['require', '필요로 하다, 요구하다']];
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 60}}>
      <In at={s + 0.2}><Card style={{width: 700, padding: '30px 40px', background: '#FAFAFA'}}>
        <div style={{fontSize: 34, fontWeight: 800, color: SUB, marginBottom: 14}}>시중 단어장</div>
        {rows.map(([en, ko], i) => (
          <In key={i} at={list + i * 0.15} dy={12}><div style={{display: 'flex', gap: 26, padding: '14px 0', borderTop: '2px solid #E5E5E5', fontSize: 40}}>
            <div style={{width: 200, fontWeight: 900}}>{en}</div><div style={{fontWeight: 600, color: SUB}}><HL at={onlyKo + i * 0.1} color={PINK}>{ko}</HL></div></div></In>))}
      </Card></In>
      <div>
        <In at={onlyKo}><Hand size={96}>한글 뜻만 쭉</Hand></In>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 20}}>
          <In at={noNuance}><Hand size={96} color={RED}>뉘앙스</Hand></In><Cross at={noNuance + 0.3} size={100} />
        </div>
      </div>
    </div>);
};

// 쌤 단어장 구성: 대표뜻 / 뉘앙스 / 체크칸 5개
const MyBook: React.FC<SP> = ({s, at: [rep, repNote, nuance, boxes, check]}) => {
  const {t} = useT();
  const W = 1240, k = W / 1992; // crop image is 1992x280
  const box = (x: number, y: number, w: number, h: number, a: number, color: string) => {
    const p = prog(t, a, 0.4);
    return <div style={{position: 'absolute', left: x * k, top: y * k, width: w * k * p, height: h * k, background: color, opacity: 0.45, borderRadius: 6, mixBlendMode: 'multiply'}} />;
  };
  const checks = Math.floor(interpolate(t, [check, check + 2.5], [0, 5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div>
      <In at={s + 0.2}><div style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30}}>
        <Chip bg={BLUE} color="#fff">쌤이 직접 만든 단어장</Chip><span style={{fontSize: 38, fontWeight: 700, color: SUB}}>시중 단어장도 이 구성대로!</span></div></In>
      <In at={s + 0.5}><div style={{position: 'relative', width: W, height: 280 * k, background: '#fff', border: `3px solid ${INK}`, borderRadius: 10, overflow: 'hidden'}}>
        <Img src={staticFile('yt1/entry_address.png')} style={{width: W}} />
        {box(465, 32, 1500, 46, rep, YEL)}
        {box(465, 92, 1500, 46, nuance, SKY)}
        {box(166, 6, 176, 38, boxes, PINK)}
        {Array.from({length: checks}).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: (172 + i * 34.2) * k - 3, top: 2 * k, fontSize: 28, fontWeight: 900, color: RED}}>✓</div>))}
      </div></In>
      <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 40}}>
        <In at={rep}><div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <Chip>① 대표뜻</Chip>
          <In at={repNote}><span style={{fontSize: 42, fontWeight: 700, color: SUB}}>고3 시험용 · address = <Strike at={repNote + 0.5}>주소</Strike> → <b style={{color: BLUE}}>다루다, 연설하다</b></span></In>
        </div></In>
        <In at={nuance}><div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <Chip bg={SKY}>② 뉘앙스</Chip><span style={{fontSize: 42, fontWeight: 700, color: SUB}}>어떤 느낌인지 이해하고 넘어가기</span></div></In>
        <In at={boxes}><div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <Chip bg={PINK}>③ 체크칸 5개</Chip><span style={{fontSize: 42, fontWeight: 700, color: SUB}}>한 번 볼 때마다 하나씩 체크</span></div></In>
      </div>
    </div>);
};

// 이해 → 체화
const Shift: React.FC<SP> = ({s, at: [next]}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
    <In at={s + 0.2}><Card style={{padding: '34px 44px', textAlign: 'center'}}>
      <div style={{fontSize: 36, fontWeight: 800, color: SUB}}>지금까지</div><Hand size={110}>단어 이해법</Hand><div style={{fontSize: 60, color: BLUE, fontWeight: 900}}>✓</div></Card></In>
    <Arrow at={next - 0.3} w={120} />
    <Pop at={next}><Card style={{padding: '34px 44px', textAlign: 'center', background: YEL}}>
      <div style={{fontSize: 36, fontWeight: 800, color: SUB}}>이제부터</div><Hand size={110} color={RED}>체화 · 암기법</Hand><div style={{fontSize: 38, fontWeight: 800}}>머릿속에 확실하게</div></Card></Pop>
  </div>);

// 5회독 플랜
const Plan: React.FC<SP> = ({s, at: [r1, important, r2, r3, r4, r5, why, skip, total]}) => {
  const {t} = useT();
  const rows: [number, string, string, number][] = [[1, '100개', '20일', r1], [2, '200개', '10일', r2], [3, '400개', '5일', r3], [4, '700개', '3일', r4], [5, '1,000개', '2일', r5]];
  const maxDays = 20;
  return (
    <div style={{display: 'flex', gap: 50, alignItems: 'flex-start'}}>
      <div>
        <In at={s + 0.2}><div style={{display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 26}}>
          <Hand size={96}>한 단어장 <HL at={s + 0.8}>5회독</HL> 필수</Hand><span style={{fontSize: 34, fontWeight: 700, color: SUB}}>2,000단어 기준</span></div></In>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          {rows.map(([n, per, days, a]) => {
            const p = prog(t, a + 0.2, 0.6);
            const d = parseInt(days, 10);
            return (
              <In key={n} at={a} dy={14}><div style={{display: 'flex', alignItems: 'center', gap: 20, height: 84}}>
                <div style={{width: 130, fontSize: 40, fontWeight: 900}}>{n}회독</div>
                <div style={{width: 260, fontSize: 38, fontWeight: 700, color: SUB, whiteSpace: 'nowrap'}}>하루 <b style={{color: INK}}>{per}</b></div>
                <div style={{position: 'relative', width: 300, height: 50}}>
                  <div style={{position: 'absolute', left: 0, top: 0, height: 50, width: 300 * (d / maxDays) * p, background: n === 1 ? YEL : SKY, border: `3px solid ${INK}`, borderRadius: 8}} />
                </div>
                <div style={{fontSize: 42, fontWeight: 900, color: n === 1 ? RED : BLUE, width: 100}}>{days}</div>
              </div></In>);
          })}
        </div>
        <In at={total} style={{marginTop: 26}}><Hand size={92} color={RED}>→ 6주면 5회독 끝!</Hand></In>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 24, marginTop: 130}}>
        <In at={important}><Card style={{padding: '22px 28px', width: 400, transform: 'rotate(2deg)', background: '#FFF7C2'}}>
          <div style={{fontSize: 30, fontWeight: 900, color: RED}}>1회독이 제일 중요!</div>
          <div style={{fontSize: 30, fontWeight: 700, marginTop: 6}}>오래 걸려도 뉘앙스 꼼꼼히</div></Card></In>
        <In at={why}><Hand size={60} color={SUB} style={{whiteSpace: 'nowrap'}}>뒤로 갈수록 왜 많아?</Hand></In>
        <In at={skip}><Card style={{padding: '22px 28px', width: 400, transform: 'rotate(-2deg)'}}>
          <div style={{fontSize: 30, fontWeight: 800}}>아는 단어 → <span style={{color: BLUE}}>PASS</span></div>
          <div style={{fontSize: 30, fontWeight: 800, marginTop: 6}}>모르는 단어만 보기</div></Card></In>
      </div>
    </div>);
};

// "쌤, 제 단어장엔 뉘앙스가 없는데요?"
const Worry: React.FC<SP> = ({s}) => (
  <div style={{position: 'relative'}}>
    <Pop at={s + 0.4}><Card style={{padding: '44px 60px', borderRadius: 40, display: 'inline-block'}}>
      <Hand size={110}>쌤, 제 단어장엔<br /><HL at={s + 1.6} color={PINK}>뉘앙스</HL>가 없는데요?</Hand></Card></Pop>
  </div>);

// 누보 영단어 분석기 (stand-in screen; swap for a real screen recording if provided)
const Analyzer: React.FC<SP> = ({s, at: [typeAt, result, ex, link]}) => {
  const {t} = useT();
  const word = 'address';
  const typed = word.slice(0, Math.floor(interpolate(t, [typeAt, typeAt + 1.2], [0, word.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const caret = Math.floor(t * 2) % 2 === 0 && t < typeAt + 2;
  return (
    <div>
      <In at={s + 0.2}><div style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24}}>
        <Chip bg={BLUE} color="#fff" size={40}>누보 영단어 분석기</Chip>
        <In at={link}><Chip size={32}>📌 링크는 고정 댓글</Chip></In></div></In>
      <In at={s + 0.5}><Card style={{width: 1160, padding: 0, overflow: 'hidden'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '22px 30px', borderBottom: `3px solid ${INK}`, background: '#F6F8FC'}}>
          <div style={{flex: 1, height: 62, border: `3px solid ${INK}`, borderRadius: 31, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 28px', fontSize: 38, fontWeight: 800}}>
            {typed}{caret ? <span style={{color: BLUE}}>|</span> : null}{!typed ? <span style={{color: GRAY, fontWeight: 600}}>단어를 입력하세요</span> : null}</div>
          <div style={{width: 62, height: 62, borderRadius: '50%', background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900}}>↑</div>
        </div>
        <div style={{padding: '28px 40px', minHeight: 420}}>
          <In at={result}><div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <Chip bg={SKY} size={28}>핵심 뉘앙스</Chip><div style={{fontSize: 46, fontWeight: 900}}><HL at={result + 0.5}>어딘가를 향한다</HL></div></div></In>
          <div style={{display: 'flex', gap: 18, marginTop: 26, marginLeft: 20}}>
            {[['편지가 향하는 곳', '주소'], ['사람들을 향해 말하다', '연설하다'], ['문제를 향해 손을 뻗다', '다루다']].map(([w, m], i) => (
              <In key={i} at={result + 0.8 + i * 0.35}><div style={{border: `3px solid ${INK}`, borderRadius: 10, padding: '14px 20px', width: 330}}>
                <div style={{fontSize: 28, fontWeight: 600, color: SUB}}>{w}</div><div style={{fontSize: 42, fontWeight: 900, color: BLUE}}>→ {m}</div></div></In>))}
          </div>
          <In at={ex} style={{marginTop: 28}}><div style={{background: '#FFF7C2', borderRadius: 10, padding: '16px 24px', fontSize: 34, fontWeight: 700}}>
            <span style={{color: RED, fontWeight: 900, marginRight: 14}}>예문</span>He <u>addressed</u> the problem. — 그는 그 문제를 다뤘다.</div></In>
        </div>
      </Card></In>
    </div>);
};

const Roadmap: React.FC<SP & {active: number}> = ({s, active}) => {
  const steps = ['단어', '독해', '어법', '문제풀이'];
  return (
    <div>
      <In at={s + 0.2}><Hand size={108}>본론 <span style={{color: BLUE}}>4단계</span></Hand></In>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 56}}>
        {steps.map((st, i) => (
          <React.Fragment key={i}>
            <In at={s + 0.6 + i * 0.25}>
              <div style={{width: 250, height: 200, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: i === active ? BLUE : i < active ? '#EEF0F4' : '#fff', color: i === active ? '#fff' : i < active ? '#9AA0AA' : INK,
                boxShadow: '0 10px 0 rgba(0,0,0,0.06)', border: `3px solid ${INK}`, position: 'relative'}}>
                <div style={{fontSize: 30, fontWeight: 800, opacity: 0.7}}>STEP {i + 1}</div>
                <div style={{fontSize: st.length > 3 ? 50 : 62, fontWeight: 900}}>{st}</div>
                {i < active ? <div style={{position: 'absolute', top: 10, right: 16, fontSize: 40, color: BLUE, fontWeight: 900}}>✓</div> : null}
              </div>
            </In>
            {i < steps.length - 1 ? <In at={s + 0.75 + i * 0.25}><div style={{fontSize: 50, fontWeight: 900, color: GRAY}}>›</div></In> : null}
          </React.Fragment>))}
      </div>
    </div>);
};

const render = (sc: WScene) => {
  const p = {s: sc.s, at: sc.at};
  switch (sc.kind) {
    case 'chapter': return <Chapter {...p} n={1} title="단어" sub="단어 공부법부터 설명할게요" />;
    case 'pairs': return <Pairs {...p} />;
    case 'sentence': return <Sentence {...p} />;
    case 'formula': return <Formula {...p} />;
    case 'address': return <Tree {...p} word="address" core="어딘가를 향한다"
      branches={[['편지가 향하는 곳', '주소'], ['사람들을 향해 말하니까', '연설하다'], ['문제를 향해 손을 뻗으니까', '다루다']]} foot={['완전 다른 뜻 3개? → 뉘앙스 하나로 이해!', '']} />;
    case 'issue': return <Tree {...p} word="issue" core="밖으로 나온다"
      branches={[['책·잡지가 밖으로 나오니까', '발행하다'], ['사람들 사이로 툭 튀어나온 문제', '쟁점']]} foot={['여러 맥락에 적용', '장기기억 → 안 까먹음']} />;
    case 'market': return <Market {...p} />;
    case 'mybook': return <MyBook {...p} />;
    case 'shift': return <Shift {...p} />;
    case 'plan': return <Plan {...p} />;
    case 'worry': return <Worry {...p} />;
    case 'analyzer': return <Analyzer {...p} />;
    case 'next': return <Roadmap {...p} active={1} />;
  }
  return null;
};

const Face: React.FC<{video: string; crop: Crop}> = ({video, crop}) => {
  const {d, ring} = CIRCLE;
  const k = (d - 2 * ring) / crop.size;
  return (
    <div style={{position: 'absolute', right: CIRCLE.right, bottom: CIRCLE.bottom, width: d, height: d, borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box',
      border: `${ring}px solid ${INK}`, background: '#222'}}>
      <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', width: SRC_W * k, height: SRC_H * k, left: -crop.x * k, top: -crop.y * k}} />
    </div>);
};

export const YTWord: React.FC<YTWordProps> = ({video, crops, scenes}) => {
  const {t} = useT();
  let idx = 0;
  scenes.forEach((s, i) => { if (t >= s.s) idx = i; });
  let crop = crops[0];
  crops.forEach((c) => { if (t >= c.s) crop = c; });
  return (
    <AbsoluteFill style={{backgroundColor: '#FBFAF5', backgroundImage: 'linear-gradient(#DCE6F5 2px, transparent 2px), linear-gradient(90deg, #DCE6F5 2px, transparent 2px)',
      backgroundSize: '54px 54px', fontFamily: FONT, color: INK}}>
      <div style={{position: 'absolute', left: 56, top: 44, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 30, color: BLUE}}>
        <div style={{width: 18, height: 18, borderRadius: '50%', background: BLUE}} />누보영어</div>
      <div style={{position: 'absolute', right: 64, top: 44, display: 'flex', gap: 10}}>
        {['단어', '독해', '어법', '문제풀이'].map((s, i) => {
          const on = i === (scenes[idx].kind === 'next' ? 1 : 0);
          return <div key={i} style={{fontSize: 26, fontWeight: 800, padding: '6px 18px', borderRadius: 6, border: `2px solid ${on ? INK : '#C8CCD4'}`,
            background: on ? YEL : 'transparent', color: on ? INK : '#A0A6B0'}}>{s}</div>;
        })}
      </div>
      <div key={idx} style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {render(scenes[idx])}
      </div>
      <Face video={video} crop={crop} />
    </AbsoluteFill>);
};
