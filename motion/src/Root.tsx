import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Video';
import {FPS} from './theme';
import {scenes, chapters, TOTAL} from './data/scenes';
import transcript from './data/transcript.json';
import {Segment} from './types';

export const RemotionRoot: React.FC = () => (
  <Composition id="Main" component={Main} fps={FPS} width={1920} height={1080}
    durationInFrames={Math.round(TOTAL * FPS)}
    defaultProps={{scenes, chapters, total: TOTAL, segments: transcript as Segment[]}} />
);
