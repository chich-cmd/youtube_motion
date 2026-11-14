import React, {useEffect, useState} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Lottie, LottieAnimationData} from '@remotion/lottie';
import {Doodle, Mood} from './Doodle';
import {PdfFlip} from './PdfFlip';

/** Animated (Noto, Lottie) emoji characters placed around hand-written lines, never over them. */
export type EmoCue = {from: number; to: number; code?: string; mood?: Mood; x: number; y: number; size: number; tilt?: number; cont?: boolean; next?: boolean;
  pdf?: {first: number; every: number}};  // pdf: show the booklet page-flip instead of a character  // next: the following cue continues the same character  // cont: same character continues, no pop-in
export type EmoProps = {video: string; cues: EmoCue[]};

const Anim: React.FC<{code: string}> = ({code}) => {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`lottie ${code}`));
  useEffect(() => {
    fetch(staticFile(`lottie/${code}.json`)).then((r) => r.json()).then((j) => { setData(j); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [code, handle]);
  return data ? <Lottie animationData={data} loop style={{width: '100%', height: '100%'}} /> : null;
};

const PAGES = ['p1.png', 'p2.png', 'p4.png', 'p5.png', 'p6.png', 'p7.png', 'p8.png', 'p9.png'];

const Cue: React.FC<{c: EmoCue; len: number}> = ({c, len}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inn = c.cont ? 1 : spring({frame: f, fps, config: {damping: 11, stiffness: 180}});
  const out = c.next ? 1 : interpolate(f, [len - 6, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const boxH = c.pdf ? (c.size * 1287) / 909 : c.size;
  const bob = Math.sin((f / fps) * Math.PI * 1.6) * 10;          // gentle float so the character feels alive
  return (
    <div style={{position: 'absolute', left: c.x - c.size / 2, top: c.y - boxH / 2 + (c.pdf ? 0 : bob), width: c.size, height: boxH,
      transform: `scale(${inn * out}) rotate(${(c.tilt ?? 0) * inn}deg)`, filter: c.mood ? undefined : 'drop-shadow(0 10px 14px rgba(0,0,0,0.18))'}}>
      {c.pdf ? <div style={{position: 'absolute', left: 0, top: 0}}><PdfFlip pages={PAGES} width={c.size} first={c.pdf.first} every={c.pdf.every} /></div>
        : c.mood ? <Doodle mood={c.mood} size={c.size} /> : <Anim code={c.code!} />}
    </div>
  );
};

export const Emo: React.FC<EmoProps> = ({video, cues}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <OffthreadVideo src={staticFile(video)} />
      {cues.map((c, i) => {
        const len = Math.round((c.to - c.from) * fps);
        return (
          <Sequence key={i} from={Math.round(c.from * fps)} durationInFrames={len}>
            <Cue c={c} len={len} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
