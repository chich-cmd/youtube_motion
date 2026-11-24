import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import '../fonts';

/**
 * YouTube long-form 1 — "단어" section. Style 3 "soft card" (chosen by the user):
 * light gray background, one white card per scene, soft shadow, one blue accent, Pretendard only.
 * Face cam: circle bottom-right, plain black ring. No captions (the editor adds them).
 * Camera never moves; elements fade up once. Times are seconds on the cut timeline (yt1/README.md).
 */
export type Crop = {s: number; x: number; y: number; size: number};
export type WScene = {kind: string; s: number; at: number[]};
export type YTWordProps = {video: string; sfx?: string; crops: Crop[]; scenes: WScene[]};

const SRC_W = 1440, SRC_H = 1080;
const CIRCLE = {d: 320, right: 56, bottom: 48, ring: 6};
const BOX = {x: 100, y: 110, w: 1260, h: 880};
const BG = '#F2F4F7', INK = '#111827', SUB = '#667085', LINE = '#EEF0F3', BLUE = '#2B63D9', BLUE_SOFT = '#EAF0FD', RED = '#E0453A', RED_SOFT = '#FDECEA', MUTE = '#C3C8D0';
const SHADOW = '0 30px 80px rgba(16,24,40,0.08)';

const useT = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return {f, fps, t: f / fps}; };
const usePop = (at: number) => { const {f, fps} = useT(); return spring({frame: f - Math.round(at * fps), fps, config: {damping: 200, stiffness: 120}}); };
const prog = (t: number, a: number, d = 0.5) => interpolate(t, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

/** gentle fade-up */
const In: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => {
  const k = usePop(at);
  return <div style={{opacity: k, transform: `translateY(${(1 - k) * 18}px)`, ...style}}>{children}</div>;
};
/** highlighter swipe behind text (yellow = key point, blue = nuance, red = wrong) */
const HL: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = 'rgba(255,212,59,0.55)', children}) => {
  const {t} = useT();
  const p = prog(t, at, 0.45);
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span style={{position: 'absolute', left: -6, right: -6, bottom: '2%', height: '46%', background: color, borderRadius: 6,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}} />
      <span style={{position: 'relative'}}>{children}</span>
    </span>);
};
const HL_BLUE = 'rgba(43,99,217,0.18)', HL_RED = 'rgba(224,69,58,0.2)';
/** underline that draws left → right */
const UL: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = BLUE, children}) => {
  const {t} = useT();
  const p = prog(t, at, 0.4);
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>{children}
      <span style={{position: 'absolute', left: 0, bottom: -6, height: 5, width: `${p * 100}%`, background: color, borderRadius: 3}} /></span>);
};
/** text that turns blue (or red) at a moment */
const Em: React.FC<{at: number; color?: string; children: React.ReactNode}> = ({at, color = BLUE, children}) => {
  const {t} = useT();
  return <span style={{color: t >= at ? color : 'inherit'}}>{children}</span>;
};
const Pill: React.FC<{tone?: 'blue' | 'red' | 'gray'; size?: number; children: React.ReactNode}> = ({tone = 'blue', size = 30, children}) => {
  const c = tone === 'blue' ? [BLUE_SOFT, BLUE] : tone === 'red' ? [RED_SOFT, RED] : ['#F2F4F7', SUB];
  return <span style={{display: 'inline-block', background: c[0], color: c[1], fontSize: size, fontWeight: 700, padding: '10px 22px', borderRadius: 999, whiteSpace: 'nowrap'}}>{children}</span>;
};
const Card: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => (
  <In at={at}><div style={{background: '#fff', borderRadius: 36, padding: '60px 68px', boxShadow: SHADOW, ...style}}>{children}</div></In>);
const Label: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{fontSize: 30, fontWeight: 600, color: SUB, marginBottom: 18}}>{children}</div>;
const Rule = () => <div style={{height: 2, background: LINE, margin: '40px 0 30px'}} />;
const Num: React.FC<{n: number | string; on?: boolean}> = ({n, on}) => (
  <div style={{width: 60, height: 60, borderRadius: 18, background: on ? BLUE : BG, color: on ? '#fff' : SUB, fontSize: 28, fontWeight: 800, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n}</div>);
/** one numbered row: [number] [left text] ............ [right text] */
const Row: React.FC<{at: number; n: number | string; left: React.ReactNode; right?: React.ReactNode; last?: boolean; rightAt?: number}> = ({at, n, left, right, last, rightAt}) => (
  <In at={at}><div style={{display: 'flex', alignItems: 'center', padding: '20px 0', borderBottom: last ? undefined : `2px solid ${LINE}`}}>
    <Num n={n} /><div style={{fontSize: 38, fontWeight: 500, color: SUB, flex: 1, marginLeft: 28}}>{left}</div>
    {right ? <In at={rightAt ?? at}><div style={{fontSize: 50, fontWeight: 800, color: INK}}><UL at={(rightAt ?? at) + 0.3}>{right}</UL></div></In> : null}
  </div></In>);

/* ---------------- scenes ---------------- */
type SP = {s: number; at: number[]};

const Chapter: React.FC<SP> = ({s}) => (
  <Card at={s + 0.1} style={{width: 900}}>
    <Pill>STEP 1</Pill>
    <div style={{fontSize: 140, fontWeight: 800, letterSpacing: -4, marginTop: 26}}>단어</div>
    <div style={{fontSize: 40, fontWeight: 500, color: SUB, marginTop: 8}}>뜻만 외우지 말고, <UL at={s + 1.2}>뉘앙스로</UL></div>
  </Card>);

const Pairs: React.FC<SP> = ({s, at: [address, issue, done, forget, apply, why]}) => (
  <Card at={s + 0.1}>
    <Label>노베이스 단어 공부, 대부분 이렇게 해요</Label>
    <div style={{display: 'flex', gap: 24}}>
      {([[address, 'address', '주소'], [issue, 'issue', '문제']] as [number, string, string][]).map(([a, en, ko], i) => (
        <In key={i} at={a}><div style={{background: BG, borderRadius: 24, padding: '28px 40px', width: 400, display: 'flex', alignItems: 'baseline', gap: 26}}>
          <div style={{fontSize: 56, fontWeight: 800}}>{en}</div><div style={{fontSize: 44, fontWeight: 500, color: SUB}}>{ko}</div></div></In>))}
      <In at={done} style={{alignSelf: 'center'}}><Pill tone="gray" size={32}>짝지어 외우고 끝</Pill></In>
    </div>
    <Rule />
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <In at={forget}><Pill tone="red" size={34}>금방 까먹음</Pill></In>
      <In at={apply}><Pill tone="red" size={34}>해석에 적용 안 됨</Pill></In>
      <In at={why}><div style={{fontSize: 44, fontWeight: 800, marginLeft: 20}}><HL at={why + 0.3}>왜 그럴까요?</HL></div></In>
    </div>
  </Card>);

const Sentence: React.FC<SP> = ({s, at: [en, ko, nope]}) => (
  <Card at={s + 0.1}>
    <Label>address = 주소 로만 외웠다면</Label>
    <In at={en}><div style={{fontSize: 80, fontWeight: 800, letterSpacing: -2}}>He <HL at={en + 0.6}>addressed</HL> the problem.</div></In>
    <Rule />
    <In at={ko}><div style={{display: 'flex', alignItems: 'center', gap: 26}}>
      <div style={{fontSize: 56, fontWeight: 600, color: SUB}}>그가 <HL at={nope} color={HL_RED}><Em at={nope} color={RED}>주소했다</Em></HL> 문제를</div>
      <In at={nope + 0.4}><Pill tone="red" size={32}>말이 안 돼요</Pill></In>
    </div></In>
  </Card>);

const Formula: React.FC<SP> = ({s, at: [meaning, nuance]}) => {
  const box = (at: number, text: string, on = false) => (
    <In at={at}><div style={{background: on ? BLUE : BG, color: on ? '#fff' : INK, borderRadius: 28, padding: '34px 52px', fontSize: 64, fontWeight: 800}}>{text}</div></In>);
  return (
    <Card at={s + 0.1}>
      <Label>단어는 <UL at={nuance + 0.5}>이렇게</UL> 알아야 해요</Label>
      <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
        {box(s + 0.4, '단어')}<In at={s + 0.6}><div style={{fontSize: 56, color: MUTE, fontWeight: 700}}>=</div></In>
        {box(meaning, '한글 뜻')}<In at={nuance - 0.2}><div style={{fontSize: 56, color: MUTE, fontWeight: 700}}>+</div></In>
        {box(nuance, '뉘앙스', true)}
      </div>
    </Card>);
};

const Tree: React.FC<SP & {word: string; core: string; branches: [string, string][]; foot: string[]}> = ({s, at, word, core, branches, foot}) => {
  const [coreAt, ...rest] = at;
  return (
    <Card at={s + 0.1} style={{width: 1180}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{fontSize: 92, fontWeight: 800, letterSpacing: -2}}>{word}</div>
      </div>
      <In at={coreAt}><div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 14}}>
        <Pill size={28}>뉘앙스</Pill><div style={{fontSize: 52, fontWeight: 800}}><HL at={coreAt + 0.4}>{core}</HL></div></div></In>
      <Rule />
      {branches.map(([why, mean], i) => (
        <Row key={i} at={rest[i * 2]} rightAt={rest[i * 2 + 1]} n={i + 1} left={why} right={mean} last={i === branches.length - 1} />))}
      <div style={{display: 'flex', gap: 16, marginTop: 34}}>
        {foot.map((f, i) => <In key={i} at={rest[branches.length * 2 + i]}><Pill tone={foot.length === 1 ? 'blue' : 'gray'} size={30}>{f}</Pill></In>)}
      </div>
    </Card>);
};

const Market: React.FC<SP> = ({s, at: [list, onlyKo, noNuance]}) => {
  const rows: [string, string][] = [['address', '주소, 연설하다, 다루다'], ['issue', '문제, 발행하다, 쟁점'], ['provide', '제공하다, 공급하다'], ['require', '필요로 하다, 요구하다']];
  return (
    <Card at={s + 0.1} style={{width: 1180}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{fontSize: 56, fontWeight: 800}}>시중 단어장</div>
        <In at={onlyKo}><Pill tone="gray">한글 뜻만 나열</Pill></In>
        <In at={noNuance}><Pill tone="red">뉘앙스 없음</Pill></In>
      </div>
      <Rule />
      {rows.map(([en, ko], i) => (
        <In key={i} at={list + i * 0.15}><div style={{display: 'flex', alignItems: 'baseline', padding: '18px 0', borderBottom: i < 3 ? `2px solid ${LINE}` : undefined}}>
          <div style={{width: 280, fontSize: 44, fontWeight: 800}}>{en}</div><div style={{fontSize: 40, fontWeight: 500, color: SUB}}><HL at={onlyKo + i * 0.12} color={HL_RED}>{ko}</HL></div></div></In>))}
    </Card>);
};

const MyBook: React.FC<SP> = ({s, at: [rep, repNote, nuance, boxes, check]}) => {
  const {t} = useT();
  const W = 1124, k = W / 1992; // crop image is 1992x280
  const mark = (x: number, y: number, w: number, h: number, a: number, color: string) => (
    <div style={{position: 'absolute', left: x * k - 4, top: y * k - 2, width: (w * k + 8) * prog(t, a, 0.5), height: h * k + 4, background: color, borderRadius: 6, mixBlendMode: 'multiply'}} />);
  const checks = Math.floor(interpolate(t, [check, check + 2.5], [0, 5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <Card at={s + 0.1}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{fontSize: 52, fontWeight: 800}}>쌤이 직접 만든 단어장</div>
        <In at={s + 1.0}><Pill tone="gray">시중 단어장도 이 구성대로</Pill></In>
      </div>
      <In at={s + 0.5} style={{marginTop: 34}}><div style={{position: 'relative', width: W, height: 280 * k, borderRadius: 16, overflow: 'hidden', border: `2px solid ${LINE}`}}>
        <Img src={staticFile('yt1/entry_perpetual.png')} style={{width: W}} />
        {mark(600, 36, 300, 42, rep, 'rgba(255,212,59,0.6)')}
        {mark(600, 96, 830, 44, nuance, 'rgba(43,99,217,0.25)')}
        {mark(166, 12, 176, 38, boxes, 'rgba(224,69,58,0.25)')}
        {Array.from({length: checks}).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: (171 + i * 34.4) * k, top: 14 * k, width: 26 * k, height: 26 * k, background: RED, borderRadius: 3}} />))}
      </div></In>
      <div style={{marginTop: 26}}>
        <Row at={rep} n={1} left={<><b style={{color: INK}}><HL at={rep + 0.2}>대표뜻</HL></b> · <span style={{opacity: prog(t, repNote)}}><UL at={repNote + 0.4}>고3 시험에 나오는 뜻</UL> 위주로</span></>} />
        <Row at={nuance} n={2} left={<><b style={{color: INK}}><HL at={nuance + 0.2} color={HL_BLUE}>뉘앙스</HL></b> · 어떤 느낌인지 이해하고 넘어가기</>} />
        <Row at={boxes} n={3} left={<><b style={{color: INK}}><HL at={boxes + 0.2} color={HL_RED}>체크칸 5개</HL></b> · 한 번 볼 때마다 하나씩 체크</>} last />
      </div>
    </Card>);
};

const Shift: React.FC<SP> = ({s, at: [next]}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 36}}>
    <Card at={s + 0.1} style={{width: 500}}>
      <Label>지금까지</Label><div style={{fontSize: 64, fontWeight: 800}}>단어 이해법</div></Card>
    <In at={next - 0.2}><div style={{fontSize: 60, color: MUTE, fontWeight: 700}}>→</div></In>
    <Card at={next} style={{width: 560, background: BLUE}}>
      <div style={{fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 18}}>이제부터</div>
      <div style={{fontSize: 64, fontWeight: 800, color: '#fff'}}><UL at={next + 0.5} color="#fff">체화 · 암기법</UL></div></Card>
  </div>);

const Plan: React.FC<SP> = ({s, at: [r1, important, r2, r3, r4, r5, why, skip, total]}) => {
  const {t} = useT();
  const rows: [number, string, number, number][] = [[1, '100개', 20, r1], [2, '200개', 10, r2], [3, '400개', 5, r3], [4, '700개', 3, r4], [5, '1,000개', 2, r5]];
  return (
    <Card at={s + 0.1} style={{padding: '50px 64px', width: 1200}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{fontSize: 56, fontWeight: 800}}>한 단어장 <HL at={s + 0.8}>5회독</HL></div>
        <Pill tone="gray">2,000단어 기준</Pill>
        <In at={total} style={{marginLeft: 'auto'}}><div style={{fontSize: 40, fontWeight: 800}}><HL at={total + 0.3}>6주면 5회독 끝</HL></div></In>
      </div>
      <div style={{height: 2, background: LINE, margin: '30px 0 14px'}} />
      {rows.map(([n, per, days, a]) => {
        const p = prog(t, a + 0.2, 0.6);
        return (
          <In key={n} at={a}><div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '14px 0'}}>
            <Num n={n} on={n === 1} />
            <div style={{width: 260, flexShrink: 0, fontSize: 38, fontWeight: 500, color: SUB, whiteSpace: 'nowrap'}}>하루 <b style={{color: INK}}>{per}</b></div>
            <div style={{width: 300, flexShrink: 0, height: 18, background: BG, borderRadius: 9}}>
              <div style={{height: 18, width: 300 * (days / 20) * p, background: n === 1 ? BLUE : '#9DB8F2', borderRadius: 9}} /></div>
            <div style={{fontSize: 42, fontWeight: 800, width: 100, whiteSpace: 'nowrap'}}>{days}일</div>
            {n === 1 ? <In at={important}><Pill tone="red" size={26}>제일 중요 · 뉘앙스 꼼꼼히</Pill></In> : null}
          </div></In>);
      })}
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 20}}>
        <In at={why}><div style={{fontSize: 34, fontWeight: 600, color: SUB}}>뒤로 갈수록 많은 이유</div></In>
        <In at={skip}><div style={{fontSize: 36, fontWeight: 700}}>아는 단어는 넘기고, <UL at={skip + 0.6}>모르는 단어만</UL></div></In>
      </div>
    </Card>);
};

const Worry: React.FC<SP> = ({s}) => (
  <Card at={s + 0.3} style={{width: 980}}>
    <Label>이런 고민 있죠?</Label>
    <div style={{fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.3}}>“쌤, 제 단어장엔<br /><HL at={s + 1.4} color={HL_BLUE}>뉘앙스</HL>가 없는데요?”</div>
  </Card>);

// stand-in screen for 누보 영단어 분석기 (swap for a real screen recording if provided)
const Analyzer: React.FC<SP> = ({s, at: [typeAt, result, ex, link]}) => {
  const {t} = useT();
  const word = 'address';
  const typed = word.slice(0, Math.floor(interpolate(t, [typeAt, typeAt + 1.2], [0, word.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  return (
    <Card at={s + 0.1} style={{padding: '46px 60px', width: 1200}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{fontSize: 50, fontWeight: 800}}>누보 영단어 분석기</div>
        <In at={link} style={{marginLeft: 'auto'}}><Pill size={28}>링크는 고정 댓글에</Pill></In>
      </div>
      <div style={{marginTop: 28, height: 76, background: BG, borderRadius: 38, display: 'flex', alignItems: 'center', padding: '0 34px', fontSize: 38, fontWeight: 700}}>
        {typed || <span style={{color: MUTE, fontWeight: 500}}>단어를 입력하세요</span>}</div>
      <div style={{marginTop: 30}}>
        <In at={result}><div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <Pill size={28}>핵심 뉘앙스</Pill><div style={{fontSize: 46, fontWeight: 800}}><HL at={result + 0.4}>어딘가를 향한다</HL></div></div></In>
        <div style={{display: 'flex', gap: 18, marginTop: 24}}>
          {[['편지가 향하는 곳', '주소'], ['사람들을 향해 말하다', '연설하다'], ['문제를 향해 손을 뻗다', '다루다']].map(([w, m], i) => (
            <In key={i} at={result + 0.6 + i * 0.3}><div style={{background: BG, borderRadius: 22, padding: '20px 26px', width: 340}}>
              <div style={{fontSize: 26, fontWeight: 500, color: SUB}}>{w}</div><div style={{fontSize: 42, fontWeight: 800, marginTop: 4}}>{m}</div></div></In>))}
        </div>
        <In at={ex} style={{marginTop: 24}}><div style={{fontSize: 32, fontWeight: 500, color: SUB}}>
          <b style={{color: BLUE, marginRight: 14}}>예문</b><span style={{color: INK}}>He addressed the problem.</span> 그는 그 문제를 다뤘다.</div></In>
      </div>
    </Card>);
};

const Roadmap: React.FC<SP> = ({s}) => {
  const steps = ['단어', '독해', '어법', '문제풀이'];
  const active = 1;
  return (
    <Card at={s + 0.1}>
      <div style={{fontSize: 56, fontWeight: 800}}>다음은 독해</div>
      <Rule />
      <div style={{display: 'flex', gap: 18}}>
        {steps.map((st, i) => (
          <In key={i} at={s + 0.4 + i * 0.15}><div style={{width: 250, height: 170, borderRadius: 28, background: i === active ? BLUE : BG,
            color: i === active ? '#fff' : i < active ? MUTE : INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6}}>
            <div style={{fontSize: 26, fontWeight: 700, opacity: 0.7}}>STEP {i + 1}{i < active ? ' ✓' : ''}</div>
            <div style={{fontSize: 52, fontWeight: 800}}>{st}</div></div></In>))}
      </div>
    </Card>);
};

const render = (sc: WScene) => {
  const p = {s: sc.s, at: sc.at};
  switch (sc.kind) {
    case 'chapter': return <Chapter {...p} />;
    case 'pairs': return <Pairs {...p} />;
    case 'sentence': return <Sentence {...p} />;
    case 'formula': return <Formula {...p} />;
    case 'address': return <Tree {...p} word="address" core="어딘가를 향한다"
      branches={[['편지가 향하는 곳', '주소'], ['사람들을 향해 말하니까', '연설하다'], ['문제를 향해 손을 뻗으니까', '다루다']]} foot={['다른 뜻 3개 → 뉘앙스 하나로 이해']} />;
    case 'issue': return <Tree {...p} word="issue" core="밖으로 나온다"
      branches={[['책·잡지가 밖으로 나오니까', '발행하다'], ['사람들 사이로 툭 튀어나온 문제', '쟁점']]} foot={['여러 맥락에 적용', '장기기억 → 안 까먹음']} />;
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
      border: `${ring}px solid ${INK}`, background: '#222', boxShadow: '0 20px 50px rgba(16,24,40,0.15)'}}>
      <OffthreadVideo src={staticFile(video)} style={{position: 'absolute', width: SRC_W * k, height: SRC_H * k, left: -crop.x * k, top: -crop.y * k}} />
    </div>);
};

export const YTWord: React.FC<YTWordProps> = ({video, sfx, crops, scenes}) => {
  const {t} = useT();
  let idx = 0;
  scenes.forEach((s, i) => { if (t >= s.s) idx = i; });
  let crop = crops[0];
  crops.forEach((c) => { if (t >= c.s) crop = c; });
  const next = scenes[idx].kind === 'next';
  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT, color: INK}}>
      <div style={{position: 'absolute', left: 100, top: 46, fontSize: 26, fontWeight: 700, color: SUB, letterSpacing: 1}}>
        STEP {next ? 2 : 1} · {next ? '독해' : '단어'}</div>
      <div key={idx} style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
        {render(scenes[idx])}
      </div>
      <Face video={video} crop={crop} />
      {sfx ? <Audio src={staticFile(sfx)} /> : null}
    </AbsoluteFill>);
};
