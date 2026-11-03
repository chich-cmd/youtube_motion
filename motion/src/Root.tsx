import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Video';
import {FPS} from './theme';
import {scenes, chapters, TOTAL} from './data/scenes';
import transcript from './data/transcript.json';
import {Scene, Segment} from './types';
import {Reel, REEL_TOTAL} from './reel/Reel';
import {Captioned, CAPTIONED_TOTAL} from './captioned/Captioned';
import ep2 from './ep2/scenes_cut.json';
import ep2Transcript from './ep2/transcript.json';
import ep3 from './ep3/scenes_cut.json';
import ep3Transcript from './ep3/transcript.json';
import ep3Captions from './ep3/captions.json';

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
