import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import '../fonts';

/**
 * YouTube long-form 1 — "단어" section. Style A "checklist" (chosen by the user, after an infographic study channel):
 * white grid paper, bold black titles with yellow highlighter, black STEP chips, blue outline pills, arrows, green checks.
 * "쌤 단어장 구성" uses layout E (real vocab-book crop + numbered callouts).
 * Face cam: circle bottom-right, plain black ring. No captions (the editor adds them).
 * Camera never moves; elements appear once. Times are seconds on the trimmed timeline (yt1/README.md).
 */
export type Crop = {s: number; x: number; y: number; size: number};
export type WScene = {kind: string; s: number; at: number[]};
export type YTWordProps = {video: string; sfx?: string; crops: Crop[]; scenes: WScene[]};

const SRC_W = 1440, SRC_H = 1080;
const CIRCLE = {d: 320, right: 56, bottom: 48, ring: 6};
const BOX = {x: 110, y: 70, w: 1300, h: 940};
const INK = '#111', SUB = '#555', BLUE = '#2F6BFF', BLUE_L = '#9DB8FF', YEL = '#FFE14D', GREEN = '#22A45D', RED = '#F0443A', MUTE = '#C9CED8', GOLD = '#F2B600';

const useT = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return {f, fps, t: f / fps}; };
const usePop = (at: number) => { const {f, fps} = useT(); return spring({frame: f - Math.round(at * fps), fps, config: {damping: 18, stiffness: 170}}); };
const prog = (t: number, a: number, d = 0.4) => interpolate(t, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

const In: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * 16}px)`, ...style}}>{children}</div>;
};
const Pop: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: Math.min(1, k * 1.5), transform: `scale(${0.5 + 0.5 * k})`, ...style}}>{children}</div>;
};
/** yellow (or other) highlighter that swipes left → right under the lower half of the text */
const HL: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = YEL, children}) => {
  const {t} = useT();
  const p = prog(t, at, 0.35);
  return (
    <span style={{position: 'relative', display: 'inline-block', padding: '0 6px'}}>
      <span style={{position: 'absolute', left: 0, top: '52%', height: '40%', width: `${p * 100}%`, background: color}} />
      <span style={{position: 'relative'}}>{children}</span>
    </span>);
};
const UL: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = BLUE, children}) => {
  const {t} = useT();
  return <span style={{position: 'relative', display: 'inline-block'}}>{children}
    <span style={{position: 'absolute', left: 0, bottom: -4, height: 5, width: `${prog(t, at, 0.35) * 100}%`, background: color, borderRadius: 3}} /></span>;
};
const Step: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 30}) => (
  <span style={{background: INK, color: '#fff', fontWeight: 900, fontSize: size, padding: '6px 16px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block'}}>{children}</span>);
const Tag: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{background: YEL, color: INK, fontWeight: 900, fontSize: 30, padding: '4px 14px', borderRadius: 4, display: 'inline-block'}}>{children}</span>);
const Pill: React.FC<{children: React.ReactNode; w?: number; fill?: boolean; size?: number; color?: string}> = ({children, w, fill, size = 36, color = BLUE}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, border: `4px solid ${color}`, borderRadius: 14, padding: '10px 22px', fontWeight: 800, fontSize: size,
    color: fill ? '#fff' : INK, background: fill ? color : '#fff', width: w, boxSizing: 'border-box', whiteSpace: 'nowrap', flexShrink: 0}}>
    <span style={{width: 16, height: 16, borderRadius: '50%', background: fill ? '#fff' : color, flexShrink: 0}} />{children}</div>);
const Arrow: React.FC<{at: number; w?: number}> = ({at, w = 100}) => {
  const {t} = useT();
  const p = prog(t, at, 0.3);
  return <svg width={w} height={30} viewBox={`0 0 ${w} 30`} style={{flexShrink: 0}}>
    <path d={`M4 15 H${w - 8} M${w - 22} 4 L${w - 6} 15 L${w - 22} 26`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={w * 1.5} strokeDashoffset={w * 1.5 * (1 - p)} /></svg>;
};
const Check: React.FC<{at: number}> = ({at}) => {
  const {t} = useT();
  const p = prog(t, at + 0.1, 0.3);
  return (
    <Pop at={at}><svg width={54} height={54} viewBox="0 0 54 54" style={{display: 'block'}}><rect x={3} y={3} width={48} height={48} rx={8} fill="#fff" stroke={GREEN} strokeWidth={5} />
      <path d="M13 28 L23 38 L42 16" stroke={GREEN} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={50} strokeDashoffset={50 * (1 - p)} /></svg></Pop>);
};
const Mark: React.FC<{plus?: boolean}> = ({plus}) => (
  <span style={{display: 'inline-flex', width: 50, height: 50, borderRadius: '50%', border: `4px solid ${plus ? BLUE : RED}`, color: plus ? BLUE : RED, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, lineHeight: 1}}>{plus ? '+' : '−'}</span>);
const En: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 48}) => (
  <span style={{fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: size}}>{children}</span>);
const Title: React.FC<{at: number; size?: number; children: React.ReactNode}> = ({at, size = 100, children}) => (
  <In at={at}><div style={{fontSize: size, fontWeight: 900, letterSpacing: -3, lineHeight: 1.15}}>{children}</div></In>);

/* ---------------- scenes ---------------- */
type SP = {s: number; at: number[]};

const Chapter: React.FC<SP> = ({s}) => (
  <div>
    <In at={s + 0.1}><Step size={40}>STEP 1</Step></In>
    <Title at={s + 0.3} size={170}><HL at={s + 0.8}>단어</HL></Title>
    <In at={s + 1.0}><div style={{fontSize: 48, fontWeight: 800, marginTop: 10}}>뜻만 외우지 말고, <span style={{color: BLUE}}>뉘앙스로</span></div></In>
  </div>);

const Pairs: React.FC<SP> = ({s, at: [address, issue, done, forget, apply, why]}) => (
  <div>
    <In at={s + 0.1}><Tag>노베이스 단어 공부, 대부분 이렇게</Tag></In>
    <Title at={s + 0.2}>영어 = 한글 <HL at={done}>짝짓기</HL></Title>
    <div style={{display: 'flex', flexDirection: 'column', gap: 26, marginTop: 44}}>
      {([[address, 'address', '주소'], [issue, 'issue', '문제']] as [number, string, string][]).map(([a, en, ko], i) => (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <In at={a}><Pill w={330}><En size={40}>{en}</En></Pill></In><Arrow at={a + 0.3} /><In at={a + 0.4}><div style={{fontSize: 56, fontWeight: 900}}>{ko}</div></In>
        </div>))}
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 56}}>
      <In at={forget}><div style={{display: 'flex', alignItems: 'center', gap: 12}}><Mark /><span style={{fontSize: 44, fontWeight: 900}}>금방 까먹음</span></div></In>
      <In at={apply}><div style={{display: 'flex', alignItems: 'center', gap: 12, marginLeft: 20}}><Mark /><span style={{fontSize: 44, fontWeight: 900}}>해석에 적용 X</span></div></In>
    </div>
    <In at={why} style={{marginTop: 36}}><div style={{fontSize: 56, fontWeight: 900}}><HL at={why + 0.3}>왜 그럴까?</HL></div></In>
  </div>);

const Sentence: React.FC<SP> = ({s, at: [en, ko, nope]}) => (
  <div>
    <In at={s + 0.1}><Tag>address = 주소 로만 외웠다면?</Tag></In>
    <In at={en} style={{marginTop: 40}}><div style={{fontSize: 84, fontWeight: 800, letterSpacing: -1}}>
      <En size={84}>He <HL at={en + 0.6}>addressed</HL> the problem.</En></div></In>
    <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 50}}>
      <Arrow at={ko - 0.2} /><In at={ko}><div style={{fontSize: 60, fontWeight: 900}}>그가 <span style={{color: RED}}><UL at={nope} color={RED}>주소했다</UL></span> 문제를</div></In>
      <Pop at={nope + 0.3}><div style={{display: 'flex', alignItems: 'center', gap: 12, marginLeft: 20}}><Mark /><span style={{fontSize: 44, fontWeight: 900, color: RED}}>말이 안 됨</span></div></Pop>
    </div>
  </div>);

const Formula: React.FC<SP> = ({s, at: [meaning, nuance]}) => (
  <div>
    <In at={s + 0.1}><Tag>단어는 이렇게 알아야 해요</Tag></In>
    <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 50}}>
      <In at={s + 0.4}><div style={{fontSize: 110, fontWeight: 900}}>단어</div></In>
      <In at={s + 0.6}><div style={{fontSize: 90, fontWeight: 900, color: MUTE}}>=</div></In>
      <In at={meaning}><Pill size={64}>한글 뜻</Pill></In>
      <In at={nuance - 0.2}><div style={{fontSize: 90, fontWeight: 900, color: MUTE}}>+</div></In>
      <Pop at={nuance}><Pill size={64} fill>뉘앙스</Pill></Pop>
    </div>
    <In at={nuance + 0.6} style={{marginTop: 40}}><div style={{fontSize: 48, fontWeight: 900}}><HL at={nuance + 0.9}>뉘앙스를 꼭 알아야 한다</HL></div></In>
  </div>);

const Tree: React.FC<SP & {word: string; core: string; tag: string; branches: [string, string, string][]; foot: string[]}> = ({s, at, word, core, tag, branches, foot}) => {
  const [coreAt, ...rest] = at;
  return (
    <div>
      <In at={s + 0.1}><Tag>{tag}</Tag></In>
      <Title at={s + 0.2}><HL at={s + 0.6}><En size={100}>{word}</En></HL> 뉘앙스 체크</Title>
      <In at={coreAt} style={{marginTop: 24}}><div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <Step>핵심 뉘앙스</Step><div style={{fontSize: 52, fontWeight: 900, color: BLUE}}>{core} →</div></div></In>
      <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24}}>
        {branches.map(([lbl, why, mean], i) => (
          <div key={i}>
            <In at={rest[i * 2]}><div style={{fontSize: 28, fontWeight: 700, color: SUB, marginBottom: 8}}>{lbl}</div></In>
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <In at={rest[i * 2]}><Pill w={600}>{why}</Pill></In><Arrow at={rest[i * 2 + 1] - 0.3} />
              <In at={rest[i * 2 + 1]}><div style={{fontSize: 56, fontWeight: 900, width: 240, whiteSpace: 'nowrap'}}><HL at={rest[i * 2 + 1] + 0.2}>{mean}</HL></div></In>
              <Check at={rest[i * 2 + 1] + 0.4} />
            </div>
          </div>))}
      </div>
      <div style={{display: 'flex', gap: 30, marginTop: 40}}>
        {foot.map((f, i) => <In key={i} at={rest[branches.length * 2 + i]}><div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 40, fontWeight: 900}}><Mark plus />{f}</div></In>)}
      </div>
    </div>);
};

const Market: React.FC<SP> = ({s, at: [list, onlyKo, noNuance]}) => {
  const rows: [string, string][] = [['address', '주소, 연설하다, 다루다'], ['issue', '문제, 발행하다, 쟁점'], ['provide', '제공하다, 공급하다']];
  return (
    <div>
      <In at={s + 0.1}><Tag>시중 단어장을 펴 보면</Tag></In>
      <Title at={s + 0.2}><HL at={onlyKo}>한글 뜻만</HL> 쭉 나열</Title>
      <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 44}}>
        {rows.map(([en, ko], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24}}>
            <In at={list + i * 0.2}><Pill w={330} color={MUTE}><En size={40}>{en}</En></Pill></In><Arrow at={list + i * 0.2 + 0.2} />
            <In at={list + i * 0.2 + 0.3}><div style={{fontSize: 44, fontWeight: 800, color: SUB}}>{ko}</div></In>
          </div>))}
      </div>
      <In at={noNuance} style={{marginTop: 46}}><div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 50, fontWeight: 900}}><Mark />뉘앙스를 잡기 어려움</div></In>
    </div>);
};

// layout E — real vocab-book crop + numbered callouts
const MyBook: React.FC<SP> = ({s, at: [rep, repNote, nuance, boxes, check]}) => {
  const {t} = useT();
  const W = 1240, k = W / 1992; // crop image is 1992x280
  const box = (x: number, y: number, w: number, h: number, c: string, a: number) => {
    const p = prog(t, a, 0.3);
    return <div style={{position: 'absolute', left: x * k - 6, top: y * k - 4, width: w * k + 12, height: h * k + 8, border: `5px solid ${c}`, borderRadius: 10, opacity: p, transform: `scale(${0.9 + 0.1 * p})`}} />;
  };
  const checks = Math.floor(interpolate(t, [check, check + 2.5], [0, 5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const num = (n: number, c: string) => (
    <span style={{display: 'inline-flex', width: 54, height: 54, borderRadius: '50%', background: c, color: '#fff', fontSize: 32, fontWeight: 900, alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{n}</span>);
  const items: [number, string, string, React.ReactNode, number][] = [
    [1, GOLD, '대표뜻', <>고3 <HL at={repNote + 0.4}>시험에 나오는 뜻</HL> 위주로</>, rep],
    [2, BLUE, '뉘앙스', <>어떤 느낌인지 <HL at={nuance + 0.6}>이해</HL>하고 넘어가기</>, nuance],
    [3, RED, '체크칸 5개', <>한 번 볼 때마다 하나씩 체크</>, boxes]];
  return (
    <div>
      <In at={s + 0.1}><Tag>시중 단어장도 이 구성대로!</Tag></In>
      <Title at={s + 0.2} size={96}>쌤 단어장 <HL at={s + 0.7}>구성</HL></Title>
      <In at={s + 0.5} style={{marginTop: 36}}><div style={{position: 'relative', width: W, height: 280 * k, background: '#fff', border: `3px solid ${INK}`, borderRadius: 12, overflow: 'hidden'}}>
        <Img src={staticFile('yt1/entry_perpetual.png')} style={{width: W}} />
        {box(610, 36, 280, 42, GOLD, rep)}{box(610, 96, 820, 44, BLUE, nuance)}{box(166, 12, 176, 38, RED, boxes)}
        {Array.from({length: checks}).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: (171 + i * 34.4) * k, top: 15 * k, width: 26 * k, height: 26 * k, background: RED, borderRadius: 3}} />))}
      </div></In>
      <div style={{display: 'flex', flexDirection: 'column', gap: 26, marginTop: 44}}>
        {items.map(([n, c, ttl, d, a]) => (
          <In key={n} at={a}><div style={{display: 'flex', alignItems: 'center', gap: 22}}>
            {num(n, c)}<div style={{fontSize: 48, fontWeight: 900, width: 270}}>{ttl}</div><Arrow at={a + 0.2} w={70} /><div style={{fontSize: 40, fontWeight: 700}}>{d}</div></div></In>))}
      </div>
    </div>);
};

const Shift: React.FC<SP> = ({s, at: [next]}) => (
  <div>
    <In at={s + 0.1}><div style={{display: 'flex', alignItems: 'center', gap: 20}}><Step>지금까지</Step><div style={{fontSize: 60, fontWeight: 900}}>단어 이해법</div><Check at={s + 0.4} /></div></In>
    <In at={next - 0.2} style={{margin: '30px 0 30px 40px'}}><svg width={40} height={80} viewBox="0 0 40 80"><path d="M20 4 V70 M6 56 L20 72 L34 56" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></In>
    <In at={next}><div style={{display: 'flex', alignItems: 'center', gap: 20}}><Step>이제부터</Step><div style={{fontSize: 96, fontWeight: 900}}><HL at={next + 0.4}>체화 · 암기법</HL></div></div></In>
    <In at={next + 0.8} style={{marginTop: 20}}><div style={{fontSize: 44, fontWeight: 800, color: SUB}}>머릿속에 확실하게 집어넣기</div></In>
  </div>);

const Plan: React.FC<SP> = ({s, at: [r1, important, r2, r3, r4, r5, why, skip, total]}) => {
  const {t} = useT();
  const rows: [number, string, number, number][] = [[1, '100개', 20, r1], [2, '200개', 10, r2], [3, '400개', 5, r3], [4, '700개', 3, r4], [5, '1,000개', 2, r5]];
  return (
    <div>
      <In at={s + 0.1}><Tag>2,000단어 기준</Tag></In>
      <Title at={s + 0.2}>한 단어장 <HL at={s + 0.8}>5회독</HL> 필수</Title>
      <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20}}>
        {rows.map(([n, per, d, a]) => {
          const p = prog(t, a + 0.4, 0.6);
          return (
            <In key={n} at={a}><div style={{display: 'flex', alignItems: 'center', gap: 22}}>
              <Step>{n}회독</Step><Pill w={290} fill={n === 1}>하루 {per}</Pill><Arrow at={a + 0.2} w={80} />
              <div style={{display: 'flex', gap: 6, flexShrink: 0}}>{Array.from({length: 20}).map((_, i) => (
                <div key={i} style={{width: 15, height: 34, borderRadius: 4, background: i < d * p ? (n === 1 ? BLUE : BLUE_L) : '#EEF1F6'}} />))}</div>
              <div style={{fontSize: 48, fontWeight: 900, width: 110, whiteSpace: 'nowrap', flexShrink: 0}}>{d}일</div>
              {n === 1 ? <In at={important}><span style={{fontSize: 32, fontWeight: 900, color: RED, whiteSpace: 'nowrap'}}>← 제일 중요! 뉘앙스 꼼꼼히</span></In> : <Check at={a + 0.9} />}
            </div></In>);
        })}
      </div>
      <In at={why} style={{marginTop: 40}}><div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 42, fontWeight: 900}}>
        <Mark plus />뒤로 갈수록 많은 이유? <In at={skip} style={{display: 'inline-block'}}><span>아는 단어는 넘기고 <UL at={skip + 0.6}>모르는 단어만</UL></span></In></div></In>
      <In at={total} style={{marginTop: 26}}><div style={{fontSize: 60, fontWeight: 900}}>→ <HL at={total + 0.3}>6주면 5회독 끝!</HL></div></In>
    </div>);
};

const Worry: React.FC<SP> = ({s}) => (
  <div>
    <In at={s + 0.1}><Tag>이런 고민 있죠?</Tag></In>
    <Title at={s + 0.4} size={104}>“쌤, 제 단어장엔<br /><HL at={s + 1.4}>뉘앙스</HL>가 없는데요?”</Title>
    <In at={s + 2.5} style={{marginTop: 40}}><div style={{display: 'flex', alignItems: 'center', gap: 16}}><Arrow at={s + 2.5} w={80} />
      <Pill fill size={44}>누보 영단어 분석기</Pill></div></In>
  </div>);

// real screen recording (sped up), framed as a browser window
const Analyzer: React.FC<SP> = ({s, at: [typeAt, result, , link]}) => {
  const {fps} = useVideoConfig();
  const W = 980, H = Math.round(W * 1074 / 1420);
  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <In at={s + 0.1}><Step>STEP 1</Step></In><In at={s + 0.2}><div style={{fontSize: 42, fontWeight: 900}}>단어 입력</div></In><Arrow at={result - 0.3} w={70} />
        <In at={result}><Step>STEP 2</Step></In><In at={result + 0.1}><div style={{fontSize: 42, fontWeight: 900}}><HL at={result + 0.4}>뉘앙스 · 뜻 · 예문</HL> 정리</div></In>
      </div>
      <In at={s + 0.3} style={{marginTop: 24}}><div style={{position: 'relative', width: W, border: `4px solid ${INK}`, borderRadius: 16, overflow: 'hidden', background: '#fff'}}>
        <div style={{height: 46, background: '#F1F3F7', borderBottom: `3px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{width: 16, height: 16, borderRadius: '50%', background: c}} />)}
          <span style={{marginLeft: 14, fontSize: 24, fontWeight: 800}}>누보 영단어 분석기</span></div>
        <div style={{position: 'relative', width: W, height: H}}>
          <Img src={staticFile('yt1/demo_first.jpg')} style={{position: 'absolute', width: W, height: H}} />
          <Sequence from={Math.round(typeAt * fps)} layout="none">
            <OffthreadVideo src={staticFile('yt1/demo.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: W, height: H}} />
          </Sequence>
        </div>
        <Pop at={typeAt} style={{position: 'absolute', right: 20, top: 66}}><div style={{background: INK, color: '#fff', fontWeight: 900, fontSize: 30, padding: '8px 18px', borderRadius: 8}}>▶▶ 빠르게</div></Pop>
      </div></In>
      <Pop at={link} style={{position: 'absolute', left: 720, top: 860}}><div style={{background: YEL, fontWeight: 900, fontSize: 34, padding: '8px 20px', borderRadius: 6, border: `3px solid ${INK}`}}>📌 링크는 고정 댓글</div></Pop>
    </div>);
};

const Roadmap: React.FC<SP> = ({s}) => {
  const steps = ['단어', '독해', '어법', '문제풀이'];
  return (
    <div>
      <In at={s + 0.1}><Tag>단어 준비 끝!</Tag></In>
      <Title at={s + 0.2}>다음은 <HL at={s + 0.7}>독해</HL></Title>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 50}}>
        {steps.map((st, i) => (
          <React.Fragment key={i}>
            <In at={s + 0.4 + i * 0.15}><div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Pill fill={i === 1} color={i === 0 ? MUTE : BLUE} size={40}>{st}</Pill>{i === 0 ? <Check at={s + 0.5} /> : null}</div></In>
            {i < steps.length - 1 ? <Arrow at={s + 0.5 + i * 0.15} w={60} /> : null}
          </React.Fragment>))}
      </div>
    </div>);
};

const render = (sc: WScene) => {
  const p = {s: sc.s, at: sc.at};
  switch (sc.kind) {
    case 'chapter': return <Chapter {...p} />;
    case 'pairs': return <Pairs {...p} />;
    case 'sentence': return <Sentence {...p} />;
    case 'formula': return <Formula {...p} />;
    case 'address': return <Tree {...p} word="address" core="어딘가를 향한다" tag="뜻이 3개라 헷갈린다면?"
      branches={[['편지를 향해', '편지가 향하는 곳', '주소'], ['사람들을 향해', '사람들을 향해 말하니까', '연설하다'], ['문제를 향해', '문제를 향해 손을 뻗으니까', '다루다']]}
      foot={['다른 뜻 3개 → 뉘앙스 하나로 이해']} />;
    case 'issue': return <Tree {...p} word="issue" core="밖으로 나온다" tag="issue도 볼게요"
      branches={[['책·잡지가', '밖으로 나오니까', '발행하다'], ['사람들 사이로', '툭 튀어나온 문제', '쟁점']]} foot={['여러 맥락에 적용', '장기기억 → 안 까먹음']} />;
    case 'market': return <Market {...p} />;
    case 'mybook': return <MyBook {...p} />;
    case 'shift': return <Shift {...p} />;
    case 'plan': return <Plan {...p} />;
    case 'worry': return <Worry {...p} />;
    case 'analyzer': return <Analyzer {...p} />;
    case 'next': return <Roadmap {...p} />;
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

export const YTWord: React.FC<YTWordProps> = ({video, sfx, crops, scenes}) => {
  const {t} = useT();
  let idx = 0;
  scenes.forEach((s, i) => { if (t >= s.s) idx = i; });
  let crop = crops[0];
  crops.forEach((c) => { if (t >= c.s) crop = c; });
  return (
    <AbsoluteFill style={{backgroundColor: '#fff', backgroundImage: 'linear-gradient(#EDF1F7 2px, transparent 2px), linear-gradient(90deg, #EDF1F7 2px, transparent 2px)',
      backgroundSize: '44px 44px', fontFamily: FONT, color: INK}}>
      <div key={idx} style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
        {render(scenes[idx])}
      </div>
      <Face video={video} crop={crop} />
      {sfx ? <Audio src={staticFile(sfx)} /> : null}
    </AbsoluteFill>);
};
