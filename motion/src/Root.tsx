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
