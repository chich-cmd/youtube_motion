import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import './fonts';
import {sec} from './anim';
import {Scene, Segment} from './types';
import {Background, Progress} from './components/Chrome';
import {Captions} from './components/Captions';
import * as S from './components/Scenes';
import * as S2 from './components/Scenes2';
import {Line} from './components/Captions';

const pick = (s: Scene, len: number) => {
  switch (s.type) {
    case 'title': return <S.TitleScene s={s} len={len} />;
    case 'section': return <S.SectionScene s={s} len={len} />;
    case 'list': return <S.ListScene s={s} len={len} />;
    case 'stat': return <S.StatScene s={s} len={len} />;
    case 'quote': return <S.QuoteScene s={s} len={len} />;
    case 'footage': return <S.FootageScene s={s} len={len} />;
    case 'timeline': return <S.TimelineScene s={s} len={len} />;
    case 'compare': return <S.CompareScene s={s} len={len} />;
    case 'ratio': return <S2.RatioScene s={s} len={len} />;
    case 'wordcard': return <S2.WordCardScene s={s} len={len} />;
    case 'plan': return <S2.PlanScene s={s} len={len} />;
    case 'notice': return <S2.NoticeScene s={s} len={len} />;
    case 'passage': return <S2.PassageScene s={s} len={len} />;
  }
};

export type VideoProps = {
  scenes: Scene[];
  segments: Segment[];
  chapters: {title: string; start: number}[];
  total: number;
  offset?: number;
  captions?: Line[];   // pre-timed caption lines; [] = build from segments
};

export const Main: React.FC<VideoProps> = ({scenes, segments, chapters, total, captions}) => (
  <AbsoluteFill>
    <Background />
    {scenes.map((s, i) => {
      const len = sec(s.end) - sec(s.start);
      return (
        <Sequence key={i} from={sec(s.start)} durationInFrames={len}>
          {pick(s, len)}
        </Sequence>
      );
    })}
    <Progress chapters={chapters} total={total} />
    <Captions segments={segments} edited={captions} />
  </AbsoluteFill>
);
