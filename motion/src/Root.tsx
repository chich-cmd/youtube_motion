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

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(TOTAL * FPS)}
      defaultProps={{scenes, chapters, total: TOTAL, segments: transcript as Segment[]}} />
    <Composition id="Ep2" component={Main} fps={FPS} width={1920} height={1080}
      durationInFrames={Math.round(ep2.total * FPS)}
      defaultProps={{scenes: ep2.scenes as Scene[], chapters: ep2.chapters, total: ep2.total, segments: ep2Transcript as Segment[], captions: []}} />
    <Composition id="Reel" component={Reel} fps={FPS} width={1080} height={1920}
      durationInFrames={Math.round(REEL_TOTAL * FPS)} />
    <Composition id="Captioned" component={Captioned} fps={FPS} width={1080} height={1920}
      durationInFrames={Math.round(CAPTIONED_TOTAL * FPS)} />
  </>
);
