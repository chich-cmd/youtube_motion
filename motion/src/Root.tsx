import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Video';
import {FPS} from './theme';
import {scenes, chapters, TOTAL} from './data/scenes';
import transcript from './data/transcript.json';
import {Scene, Segment} from './types';
import {Reel, REEL_TOTAL} from './reel/Reel';
import {Short, ShortProps, END, shortLength} from './short/Short';
import {Paper} from './paper/Paper';
import {Emo} from './emo/Emo';
import paperLines from './paper/full_lines.json';
import {Captioned, CAPTIONED_TOTAL} from './captioned/Captioned';
import ep2 from './ep2/scenes_cut.json';
import ep2Transcript from './ep2/transcript.json';
import ep3 from './ep3/scenes_cut.json';
import ep3Transcript from './ep3/transcript.json';
import ep3Captions from './ep3/captions.json';
import ep4 from './ep4/scenes_cut.json';
import ep4Transcript from './ep4/transcript.json';
import ep4Captions from './ep4/captions.json';
import ep4Fx from './ep4/fx.json';
import {Fx} from './components/Fx';
import {Tip} from './tip/Tip';
import {Cover} from './tip/Cover';
import {StudyCard} from './tip/StudyCard';
import {SeriesCover} from './tip/SeriesCover';
import {LongForm, LFMark} from './tip/LongForm';
import {Rp9Long} from './tip/Rp9Long';
import {Thumb} from './tip/Thumb';
import {Mg, MgScene} from './tip/Mg';
import {Mg2} from './tip/Mg2';
import {Gr, GrEl, GrTheme} from './tip/Gr';
import rp10 from './tip/rp10.json';
import rp9 from './tip/rp9.json';
import rp9r from './tip/rp9r.json';
import rp9vo from './tip/rp9vo.json';
import {Listen} from './tip/Listen';
import {Annot, Mark} from './tip/Annot';
import annotSample from './tip/annot_sample.json';
import rp4 from './tip/rp4.json';
import rp4hook from './tip/rp4hook.json';
import rp5s from './tip/rp5_sample.json';
import rp5 from './tip/rp5.json';
import rp5short from './tip/rp5short.json';
import rp6 from './tip/rp6.json';
import rp7s from './tip/rp7_sample.json';
import rp7 from './tip/rp7.json';
import rp7hook from './tip/rp7hook.json';
import rp8 from './tip/rp8.json';
import rp5sA from './tip/rp5short_A.json';
import rp5sB from './tip/rp5short_B.json';
import rp5sC from './tip/rp5short_C.json';
import listenLines from './tip/listen_lines.json';
import listenZooms from './tip/listen_zooms.json';
import tipLines from './tip/lines.json';
import tipZooms from './tip/zooms.json';

const EP2_EMPH = {
  key: '덩어리|전치사|명사|주어|동사|준동사|접속사|슬래시|콤마|문장 부호|ing|-ed|\\bto\\b|\\bof\\b|\\bas\\b|measure|Despite',
  warn: '아니죠|안 끊|끊지 말|끊지 않',
};
const EP3_EMPH = {
  key: '\\d+(?:~\\d+)?번|\\d+, ?\\d+번|\\d(?:~\\d)?등급|\\d단계|목적|심경|대의 ?파악|도표|일치 불일치|어법|어휘|빈칸|함축 의미|무관한 문장|순서 삽입|문삽|요약|스토리 장문|장문|지시사|연결사|역접속사|역접|순접|주제문?|선행사|수일치|능동|수동|이니셜|필기가 생명|예측|핵심|동사 n\\+1개',
  warn: '무조건|절대|꼭|주의|조심|낚시|틀리|오답|하지 마세요|안 됩니다',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(TOTAL * FPS)}
      defaultProps={{scenes, chapters, total: TOTAL, segments: transcript as Segment[]}} />
    <Composition id="Ep2" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(ep2.total * FPS)}
      defaultProps={{scenes: ep2.scenes as Scene[], chapters: ep2.chapters, total: ep2.total, segments: ep2Transcript as Segment[], captions: []}} />
    {SHORTS.map((p) => (
      <Composition key={p.id} id={p.id} component={Short} fps={FPS} width={1080} height={1920}
        durationInFrames={Math.round((shortLength(p.props.parts) + END + (p.props.intro ?? 0)) * FPS)} defaultProps={p.props} />
    ))}
    {(['A', 'B', 'C'] as const).map((look) => (
      <Composition key={look} id={`Tip${look}`} component={Tip} fps={30} width={1080} height={1920} durationInFrames={3990}
        defaultProps={{video: 'cut3hi.mp4', lines: tipLines, look, reel: true, zooms: tipZooms, title: '해석 약해도\n{주제·제목} 맞히는 법'}} />
    ))}
    <Composition id="CoverLight" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1} defaultProps={{dark: false}} />
    <Composition id="CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1} defaultProps={{dark: true}} />
    <Composition id="ListenReel" component={Listen} fps={30} width={1080} height={1920} durationInFrames={4017}
      defaultProps={{video: 'listen.mp4', lines: listenLines, zooms: listenZooms, title: '수능 영어 듣기\n{11~15번} 안 틀리는 법',
        crop: {x: 290, y: 0, w: 1340, h: 905}, winTop: 420}} />
    <Composition id="ListenCoverLight" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: false, lines: ['듣기 {11~15번}', '이렇게 들어야', '안 틀립니다']}} />
    <Composition id="ListenCoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['듣기 {11~15번}', '이렇게 들어야', '안 틀립니다'], bg: 'cover_listen_bg.jpg'}} />
    {(['A', 'B', 'C'] as const).map((look) => (
      <Composition key={look} id={`Annot${look}`} component={Annot} fps={30} width={1080} height={1920} durationInFrames={338}
        defaultProps={{video: 'rp4_v3.mp4', look, title: '순서 문제\n{전개도}로 푸는 법', lines: annotSample.lines,
          marks: (annotSample.marks as Mark[]).filter((m) => look === 'A' ? m.kind === 'hl' : look === 'B' ? m.kind !== 'hl' && m.kind !== 'spot' : m.kind === 'hl' || m.kind === 'spot')}} />
    ))}
    <Composition id="Rp4Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={3690}
      defaultProps={{video: 'rp4full.mp4', look: 'C', title: '순서 문제 {전개도}로\n짱 쉽게 푸는 법', marks: rp4.marks as Mark[], lines: rp4.lines, cards: rp4.cards, notes: rp4.notes, cams: rp4.cams}} />
    <Composition id="Rp4Hook" component={Annot} fps={30} width={1080} height={1920} durationInFrames={148}
      defaultProps={{video: 'rp4hook.mp4', look: 'C', title: '순서 문제 {전개도}로\n짱 쉽게 푸는 법', marks: rp4hook.marks as Mark[], lines: rp4hook.lines, cards: rp4hook.cards, notes: [], cams: rp4hook.cams}} />
    <Composition id="Rp4CoverLight" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: false, lines: ['순서 문제', '{전개도}로', '짱 쉽게 푸는 법']}} />
    <Composition id="Rp4CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['순서 문제', '{전개도}로', '짱 쉽게 푸는 법'], bg: 'cover_rp4_bg.jpg'}} />
    {(['A', 'B', 'C'] as const).map((k) => (
      <Composition key={k} id={`Rp5${k}`} component={Annot} fps={30} width={1080} height={1920} durationInFrames={3925}
        defaultProps={{video: 'rp5.mp4', look: 'C', title: '영어 해석\n{되돌아가지 않는} 법', marks: rp5s[k] as Mark[], lines: rp5s.lines, cards: [], notes: [], cams: rp5s.cams}} />
    ))}
    <Composition id="Rp5Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={3948}
      defaultProps={{video: 'rp5.mp4', look: 'C', title: '영어 해석\n{되돌아가지 않는} 법', marks: rp5.marks as Mark[], lines: rp5.lines, cards: [], notes: [], cams: rp5.cams}} />
    <Composition id="Rp5CoverLight" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: false, lines: ['이 방법으로', '영어 문장', '{한글처럼} 읽음'], uniform: true, badge: '1'}} />
    <Composition id="Rp5CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['이 방법으로', '영어 문장', '{한글처럼} 읽음'], uniform: true, badge: '1', bg: 'cover_rp5_bg.jpg'}} />
    <Composition id="Rp5Short" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp5short.total * 30)}
      defaultProps={{video: 'rp5short.mp4', look: 'C', title: '영어 지문\n{한 번에} 읽는 법', marks: rp5short.marks as Mark[], lines: rp5short.lines, cards: rp5short.cards, notes: [], cams: rp5short.cams}} />
    {([['A', rp5sA], ['B', rp5sB], ['C', rp5sC]] as const).map(([k, v]) => (
      <Composition key={k} id={`Rp5Test${k}`} component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(v.total * 30)}
        defaultProps={{video: 'rp5short.mp4', look: 'C', title: v.title, marks: v.marks as Mark[], lines: v.lines, cards: v.cards, notes: [], cams: v.cams}} />
    ))}
    <Composition id="StudyCard1" component={StudyCard} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{no: '01', head: ['노베이스의 문제 :', '했던 해석 또 함'], label: '예문',
        example: 'I met a friendly woman who speaks three different languages very well.'}} />
    <Composition id="Rp6Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp6.total * 30)}
      defaultProps={{video: 'rp6.mp4', look: 'C', title: '영어 해석\n{2배 빨리} 하는 법', titleSize: 116, marks: rp6.marks as Mark[], lines: rp6.lines, cards: rp6.cards, notes: [], cams: rp6.cams}} />
    <Composition id="Rp6TitleBand" component={Annot} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{video: 'rp6.mp4', look: 'C', title: '영어 해석\n{2배 빨리} 하는 법', titleSize: 116, marks: [], lines: [], cards: [], notes: [], cams: []}} />
    <Composition id="Rp6CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['영어 해석', '{2배 빨리}하는', '꿀팁'], uniform: true, bg: 'cover_rp6_bg.jpg'}} />
    {(['P', 'C', 'Y'] as const).map((k) => (
      <Composition key={k} id={`Rp7S${k}`} component={Annot} fps={30} width={1080} height={1920} durationInFrames={300}
        defaultProps={{video: 'rp7_v6.mp4', look: 'C', title: '순서 문제\n{추상 → 구체} 전개도', titleSize: 104, marks: rp7s.looks[k] as Mark[], lines: rp7s.lines, cards: [], notes: [], cams: rp7s.cams}} />
    ))}
    <Composition id="Rp7Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp7.total * 30)}
      defaultProps={{video: 'rp7fx.mp4', look: 'C', title: '순서 1분컷 꿀팁\n{추상 → 구체} 전개도', titleSize: 104, marks: rp7.marks as Mark[], lines: rp7.lines, cards: rp7.cards, notes: [], cams: rp7.cams, chips: rp7.chips}} />
    <Composition id="Rp7CoverDark2" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['순서 {앞, 뒤}', '헷갈릴 때', '이 방법으로', '1분컷'], uniform: true, maxSize: 200, bg: 'cover_rp7_bg.jpg'}} />
    <Composition id="Rp7CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['순서 문제', '{추상 구체}로', '1분컷 하는 법'], uniform: true, bg: 'cover_rp7_bg.jpg'}} />
    {['해석', '문풀', '독해', '내신', '공부법'].map((t, i) => (
      <Composition key={t} id={`Series${i + 1}`} component={SeriesCover} fps={30} width={1080} height={1440} durationInFrames={1} defaultProps={{topic: t}} />
    ))}
    <Composition id="Rp7Hook" component={Annot} fps={30} width={1080} height={1920} durationInFrames={351}
      defaultProps={{video: 'rp7hookfx.mp4', look: 'C', title: '순서 1분컷 꿀팁\n{추상 → 구체} 전개도', titleSize: 104, marks: rp7hook.marks as Mark[], lines: rp7hook.lines, cards: rp7hook.cards, notes: [], cams: rp7hook.cams}} />
    <Composition id="Rp8Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp8.total * 30)}
      defaultProps={{video: 'rp8bfx.mp4', look: 'C', title: '순서 {추상 구체}로\n1분컷 하는 법', titleSize: 104, marks: rp8.marks as Mark[], lines: rp8.lines, cards: rp8.cards, notes: [], cams: rp8.cams, chips: rp8.chips}} />
    <Composition id="Rp8CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['순서 문제', '{내용 비슷할 때}', '1분컷 하는 법'], uniform: true, bg: 'cover_rp7_bg.jpg'}} />
    {(['A', 'B', 'C', 'D'] as const).map((k) => <Composition key={k} id={`Rp9Thumb${k}`} component={Thumb} fps={30} width={1280} height={720} durationInFrames={1} defaultProps={{v: k}} />)}
    {([['P1', {main: '#1F3A68', mainBg: '#E4EAF4', sub: '#E39B2D', subBg: '#FBEFD9', paper: '#F5F0E6'}],
       ['P2', {main: '#2352E8', mainBg: '#E3EBFF', sub: '#FF7A1A', subBg: '#FFEBDC', paper: '#F3F1EC', grid: true}],
       ['P3', {main: '#1E6B52', mainBg: '#E1F0EA', sub: '#EE6A55', subBg: '#FCE6E1', paper: '#F7F3EA'}]] as [string, GrTheme][]).map(([id, th]) => (
      <Composition key={id} id={`Gr3${id}`} component={Gr} fps={30} width={1080} height={1920} durationInFrames={150}
        defaultProps={{theme: th, top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', step: 'STEP 3', head: '중학 단어 ≠ {고등} 단어', lines: [{s: 0, e: 5, text: '{address} 주소 아니고 다루다, 연설하다'}],
          els: [{s: 0.2, k: 'card', x: 70, y: 470, w: 940, size: 50, text: 'The mayor will [address] the problem.', marks: [{s: 0.7, text: '', label: '다루다', c: 'blue'}]},
            {s: 1.2, k: 'circle', x: 300, y: 1030, r: 150, text: '주소', c: 'red'}, {s: 1.5, k: 'text', x: 0, y: 985, text: 'vs', size: 72, center: true},
            {s: 1.8, k: 'circle', x: 780, y: 1030, r: 150, text: '다루다\n연설하다', c: 'blue'}] as GrEl[]}} />))}
    <Composition id="Rp10CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['예비고1', '고등 {1등급} 받는', '영어 공부법'], uniform: true, bg: 'cover_rp10_bg.jpg'}} />
    {(['curve', 'ring', 'tap'] as const).map((v) => <Composition key={v} id={`Fol${v}`} component={Gr} fps={30} width={1080} height={1920} durationInFrames={90}
      defaultProps={{top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', head: '앞으로 올라올 {꿀팁}', lines: [{s: 0, e: 3, text: '준비하고 싶으면 쌤 {팔로우해!}'}],
        els: [{s: 0, k: 'text', x: 0, y: 520, text: '고등영어 준비는', size: 72, center: true}, {s: 0, k: 'follow', y: 660, tap: 9, avatar: 'nouve_avatar.png', name: 'nou.ve', sub: '누보영어 · 고등영어 꿀팁'},
          {s: 0.2, k: 'point', x: 560, y: 1560, v}] as GrEl[]}} />)}
    <Composition id="Rp10Reel" component={Gr} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp10.total * 30)}
      defaultProps={{top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', head: '', heads: rp10.heads, audio: 'rp10_voice.m4a', els: rp10.els as GrEl[], lines: rp10.lines}} />
    <Composition id="Gr1" component={Gr} fps={30} width={1080} height={1920} durationInFrames={150}
      defaultProps={{top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', head: '중학 영어 vs {고등} 영어', lines: [{s: 0, e: 5, text: '중학 영어 A여도 고등 가면 등급 {X}'}],
        els: [{s: 0.2, k: 'circle', x: 290, y: 720, r: 170, text: '중학\nA', c: 'red'}, {s: 0.5, k: 'text', x: 0, y: 675, text: 'vs', size: 80, center: true},
          {s: 0.8, k: 'circle', x: 790, y: 720, r: 170, text: '고등\n?등급', c: 'blue'}, {s: 1.4, k: 'text', x: 0, y: 1020, text: '시험 범위 기본 {5배}', size: 84, center: true}] as GrEl[]}} />
    <Composition id="Gr2" component={Gr} fps={30} width={1080} height={1920} durationInFrames={150}
      defaultProps={{top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', step: 'STEP 1', head: '문법 끝판왕 잡기', lines: [{s: 0, e: 5, text: '처음 보는 문장도 {구조}가 보이게'}],
        els: [{s: 0.2, k: 'card', x: 70, y: 430, w: 940, size: 46, text: 'The policy [that we approved] [will affect] residents.',
            marks: [{s: 0.7, text: '', label: '꾸밈 (관계절)', c: 'red'}, {s: 1.2, text: '', label: '진짜 동사', c: 'blue'}]},
          {s: 1.8, k: 'img', x: 390, y: 900, w: 300, src: 'book_grammarholic.jpg', cap: 'EBS 로즈리 Grammar Holic'}] as GrEl[]}} />
    <Composition id="Gr3" component={Gr} fps={30} width={1080} height={1920} durationInFrames={150}
      defaultProps={{top: '예비고1 고등학생 때\n{1등급 맞는 영어 공부법}', step: 'STEP 3', head: '중학 단어 ≠ {고등} 단어', lines: [{s: 0, e: 5, text: '{address} 주소 아니고 다루다, 연설하다'}],
        els: [{s: 0.2, k: 'card', x: 70, y: 450, w: 940, size: 50, text: 'The mayor will [address] the problem.', marks: [{s: 0.7, text: '', label: '다루다', c: 'blue'}]},
          {s: 1.2, k: 'circle', x: 300, y: 1010, r: 150, text: '주소', c: 'red'}, {s: 1.5, k: 'text', x: 0, y: 965, text: 'vs', size: 72, center: true},
          {s: 1.8, k: 'circle', x: 780, y: 1010, r: 150, text: '다루다\n연설하다', c: 'blue'}, {s: 2.4, k: 'tick', x: 300, y: 1010, size: 230, type: 'x'}, {s: 3.0, k: 'tick', x: 925, y: 860, size: 130, type: 'check'}] as GrEl[]}} />
    {(['A', 'B', 'C'] as const).map((k) => <Composition key={k} id={`Mg2${k}`} component={Mg2} fps={30} width={1080} height={1920} durationInFrames={300}
      defaultProps={{look: k, title: '고등 영어 {1등급} 공부법', steps: [{s: 0, e: 10, n: 1, key: '문법'}],
        focus: [{s: 0.3, e: 4, img: 'book_grammarholic.jpg', label: 'EBS 로즈리쌤 그래머홀릭'}, {s: 4, e: 10, text: '강의 없이\n{설명}될 때까지 반복'}],
        lines: [{s: 0, e: 4, text: '{로즈리쌤} 그래머홀릭 듣고'}, {s: 4, e: 10, text: '강의 안 보고 설명할 수 있을 때까지'}]}} />)}
    {(['A', 'B', 'C'] as const).map((k) => <Composition key={k} id={`Mg${k}`} component={Mg} fps={30} width={1080} height={1920} durationInFrames={300}
      defaultProps={{look: k, title: '고등 영어 {1등급}\n겨울방학 3가지', lines: [{s: 0, e: 10, text: '{EBS 로즈리쌤} 그래머홀릭 듣고'}],
        scenes: [{s: 0, e: 10, n: 1, key: '문법', sub: '지문 변형돼도 구조가 보이게', img: 'book_grammarholic.jpg', imgLabel: 'EBS 로즈리 Grammar Holic',
          pts: [{s: 0.6, t: '시험 때 벼락치기 {X}'}, {s: 1.2, t: '처음 보는 문장도\n{구조} 따지기'}, {s: 1.8, t: '강의 없이 {설명}될 때까지'}]}] as MgScene[]}} />)}
    <Composition id="Rp9CoverDark" component={Cover} fps={30} width={1080} height={1920} durationInFrames={1}
      defaultProps={{dark: true, lines: ['내신 영어', '{벼락치기}', '필승법'], uniform: true, bg: 'cover_rp9_bg.jpg'}} />
    <Composition id="Rp9Vo" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.round(rp9vo.total * 30)}
      defaultProps={{video: 'rp9vofx.mp4', look: 'C', title: '내신 {벼락치기}\n필승법 3단계', titleSize: 104, marks: [] as Mark[], lines: rp9vo.lines, cards: rp9vo.cards, notes: [], cams: [], chips: rp9vo.chips,
        intro: {big: {e: 2.35, lines: ['내신 영어', '{벼락치기}', '필승법']}, e: rp9vo.chips[0].s - 0.05, head: '내신 {벼락치기}', hs: 2.35, hx: 60, hy: 430, items: [{s: 2.4, y: 580, t: '내용 숙지', sub: '좌지문 · 우해석'}, {s: 3.3, y: 715, t: '변형 문제', sub: '써먹기'}, {s: 4.2, y: 880, t: '서술형 공부', sub: '선생님 강조 · 문장 덩어리'}]}}} />
    <Composition id="Rp9Reel" component={Annot} fps={30} width={1080} height={1920} durationInFrames={Math.floor(rp9r.total * 30)}
      defaultProps={{video: 'rp9rfx.mp4', look: 'C', title: '내신 {벼락치기}\n3단계 공부법', titleSize: 104, marks: [] as Mark[], lines: rp9r.lines, cards: rp9r.cards, notes: [], cams: [], chips: rp9r.chips}} />
    <Composition id="Rp9Long" component={Rp9Long} fps={30} width={1920} height={1080} durationInFrames={Math.floor(rp9.dur * 30)}
      defaultProps={{video: 'rp9fx.mp4', lines: rp9.lines, states: rp9.states, cards: rp9.cards, chapters: rp9.chapters, patches: rp9.patches}} />
    {(['A', 'B', 'C'] as const).map((k) => (
      <Composition key={k} id={`Lf${k}`} component={LongForm} fps={30} width={1920} height={1080} durationInFrames={14850}
        defaultProps={{video: 'rp9raw.mp4', look: k, step: 1, sub: 2,
          lines: [{s: 150, e: 175, text: '한글 해석에서 {중요한 부분}을 영어에도 형광펜!'}],
          marks: [{s: 150, e: 175, kind: 'hl', x: 216, y: 123, w: 548, h: 20}, {s: 150, e: 175, kind: 'hl', x: 216, y: 157, w: 548, h: 20}, {s: 150, e: 175, kind: 'box', x: 806, y: 90, w: 280, h: 100}] as LFMark[],
          card: {s: 150, e: 175, label: '1단계 ③', text: '한글에서 중요 → \n영어에도 {형광펜}'}}} />
    ))}
    <Composition id="EmoReel" component={Emo} fps={FPS} width={1080} height={1920} durationInFrames={568}
      defaultProps={{video: 'rp_base.mp4', cues: [
        // clip 1: 혹시 올해 수능봐..? / 그렇다면 이 릴스가 / 수능 전 최고의 기회
        {from: 0.1, to: 3.3, code: '1f914', x: 540, y: 1370, size: 380},
        {from: 3.3, to: 5.3, code: '1f440', x: 540, y: 1370, size: 380},
        {from: 5.3, to: 8.17, code: '1f929', x: 540, y: 1370, size: 400},
        {from: 6.3, to: 8.17, code: '2728', x: 930, y: 380, size: 170, tilt: 12},
        // clip 2: 영어 모고 풀 때 / 지문 대충 알겠는데도
        {from: 8.27, to: 10.8, code: '1f913', x: 540, y: 1230, size: 380},
        {from: 10.8, to: 13.23, code: '1f605', x: 540, y: 1230, size: 380},
        // clip 3: 선지 해석 어렵거나 / 이해 안 돼서 / 틀린 적 있지?!
        {from: 13.33, to: 15.7, code: '1f635_200d_1f4ab', x: 540, y: 1260, size: 380},
        {from: 15.7, to: 18.93, code: '1f62d', x: 540, y: 1260, size: 400},
      ]}} />
    <Composition id="DoodleReel" component={Emo} fps={FPS} width={1080} height={1920} durationInFrames={2003}
      defaultProps={{video: 'rp_base.mp4', cues: [
        // timings follow the narration (word times from the voice track)
        // 1 혹시 올해 수능 봐? 그렇다면 이 릴스가 수능 전 최고의 기회가 될 거야
        {from: 0.1, to: 4.5, mood: 'think', x: 540, y: 1420, size: 640, next: true},
        {from: 4.5, to: 6.7, mood: 'look', x: 540, y: 1420, size: 640, cont: true, next: true},
        {from: 6.7, to: 9.8, mood: 'excited', x: 540, y: 1420, size: 640, cont: true},
        // 2 영어 모의고사 풀 때 지문 대충 알겠는데도
        {from: 9.9, to: 12.2, mood: 'study', x: 540, y: 1300, size: 640, next: true},
        {from: 12.2, to: 14.9, mood: 'sweat', x: 540, y: 1300, size: 640, cont: true},
        // 3 선지 해석 어렵거나 이해 안 돼서 틀린 적 있지
        {from: 15.0, to: 19.8, mood: 'dizzy', x: 540, y: 1330, size: 640, next: true},
        {from: 19.8, to: 21.77, mood: 'cry', x: 540, y: 1330, size: 640, cont: true},
        // 4 그게 다 선지 비유적 의미나 관용구를 몰라서 그래
        {from: 21.87, to: 23.8, mood: 'look', x: 540, y: 1420, size: 600, next: true},
        {from: 23.8, to: 26.97, mood: 'sweat', x: 540, y: 1420, size: 600, cont: true},
        // 5 영어 선지는 이게 답이려면 지문에 나와야 하는 내용을 역추적할 수 있으면 절대 안 틀리거든
        {from: 27.07, to: 32.2, mood: 'study', x: 540, y: 1390, size: 600, next: true},
        {from: 32.2, to: 35.6, mood: 'excited', x: 540, y: 1390, size: 600, cont: true},
        // 6-8 13년차 영쌤인 누보쌤이 ... 문제 훨씬 쉽고 빠르게 풀릴 거야: the booklet flips
        {from: 35.7, to: 42.8, pdf: {first: 0, every: 1.0}, x: 540, y: 1140, size: 580},
        {from: 42.8, to: 48.97, pdf: {first: 7, every: 1.0}, x: 540, y: 1265, size: 480},
        {from: 48.97, to: 54.43, pdf: {first: 5, every: 1.0}, x: 540, y: 930, size: 400},
        // 8b 쌤도 수많은 사람들도 우리 수험생들을 응원하고 있으니 수능 대박나자
        {from: 54.53, to: 60.63, mood: 'win', x: 540, y: 1330, size: 640},
        // 9 자료 받을 친구들은 쌤 팔로우하고 댓글에 선지완성 적어줘
        {from: 60.73, to: 66.73, mood: 'look', x: 540, y: 1330, size: 600},
      ]}} />
    <Composition id="PaperFull" component={Paper} fps={FPS} width={1080} height={1920} durationInFrames={982}
      defaultProps={{video: 'imb_full.mp4', title: ['기말 역전하는', '4주 플래너'], lines: paperLines}} />
    <Composition id="PaperSample" component={Paper} fps={FPS} width={1080} height={1920} durationInFrames={445}
      defaultProps={{video: 'imb_sample.mp4', title: ['기말 역전하는', '4주 플래너'], lines: [
        {s: 0.0, e: 1.7, text: '{기말 역전}하고 싶은데'},
        {s: 1.7, e: 3.34, text: '어떻게 공부해야 되는지 모르겠는'},
        {s: 3.34, e: 4.35, text: '학생들 [주목!]'},
        {s: 4.4, e: 6.76, text: '{13년차} 영어쌤인 제가'},
        {s: 6.76, e: 8.74, text: '[주차별 공부법]'},
        {s: 8.74, e: 10.0, text: '<시험 포인트>'},
        {s: 10.0, e: 10.95, text: '{오답 노트}'},
        {s: 10.95, e: 12.34, text: '내용 기억하는 데 ((꼭 필요한))'},
        {s: 12.34, e: 14.8, text: '[전개도 작성법]에다가'},
      ]}} />
    <Composition id="Ep4" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(ep4.total * FPS)}
      defaultProps={{scenes: ep4.scenes as Scene[], chapters: ep4.chapters, total: ep4.total, segments: ep4Transcript as Segment[],
        captions: ep4Captions, fx: ep4Fx as Fx[]}} />
    <Composition id="Ep3" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(ep3.total * FPS)}
      defaultProps={{scenes: ep3.scenes as Scene[], chapters: ep3.chapters, total: ep3.total, segments: ep3Transcript as Segment[],
        captions: ep3Captions, emph: EP3_EMPH}} />
    <Composition id="Reel" component={Reel} fps={FPS} width={1080} height={1920}
      durationInFrames={Math.round(REEL_TOTAL * FPS)} />
    <Composition id="Captioned" component={Captioned} fps={FPS} width={1080} height={1920}
      durationInFrames={Math.round(CAPTIONED_TOTAL * FPS)} />
  </>
);

const SHORTS: {id: string; props: ShortProps}[] = [
  {id: 'Short2', props: {video: 'ep3_final.mp4', parts: [[58.98, 97.67]], hook: ['영어 듣기,', '다 안 들려도 전략을 알면 풀립니다'], intro: 3.2,
    captions: ep3Captions, emph: EP3_EMPH}},
  {id: 'Short3', props: {video: 'ep2_final.mp4', parts: [[394.68, 401.28], [403.57, 408.34], [412.48, 419.06], [451.88, 461.87], [462.1, 476.18], [476.43, 480.98], [494.3, 497.34], [500.81, 502.76], [508.06, 513.54], [516.28, 520.43], [530.06, 534.73], [553.3, 660.2]], hook: ['영어 해석 하나도 안 되는', '핵노베이스 1등급 만든 해석법'], intro: 3.6,
    segments: ep2Transcript as Segment[], emph: EP2_EMPH}},
  {id: 'Short3b', props: {video: 'ep2_final.mp4', parts: [[720.47, 726.16], [726.13, 730.94], [755.55, 758.89], [787.27, 791.4], [793.01, 799.98], [827.16, 833.43], [836.47, 843.18], [867.18, 871.45], [887.36, 891.54], [906.68, 916.16]], hook: ['영어 해석 하나도 안 되는', '핵노베이스 1등급 만든 해석법'],
    segments: ep2Transcript as Segment[], emph: EP2_EMPH}},
  {id: 'Short4', props: {video: 'ep3_final.mp4', parts: [[280.77, 284.77], [291.97, 349.07]], hook: ['수능 어법 10년치 분석해봤더니', '정답 선지는 이거였습니다'], intro: 3, endCard: 'follow',
    captions: ep3Captions, emph: EP3_EMPH}},
];
