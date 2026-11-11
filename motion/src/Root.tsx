import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Video';
import {FPS} from './theme';
import {scenes, chapters, TOTAL} from './data/scenes';
import transcript from './data/transcript.json';
import {Scene, Segment} from './types';
import {Reel, REEL_TOTAL} from './reel/Reel';
import {Short, ShortProps, END, shortLength} from './short/Short';
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
  {id: 'Short4', props: {video: 'ep3_final.mp4', parts: [[280.77, 284.77], [291.97, 349.07]], hook: ['수능 어법 10년치 분석해보니', '정답이 되는 건 정해져있었다'],
    captions: ep3Captions, emph: EP3_EMPH}},
];
