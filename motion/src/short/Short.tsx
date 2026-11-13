import React, {useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, FPS} from '../theme';
import {enter, pop} from '../anim';
import {Segment} from '../types';
import {Emph, Line, buildLines, holdLines, paint} from '../components/Captions';

/**
 * Vertical (1080x1920) short cut from a finished 16:9 episode: a two-line hook on top, the episode
 * (captions cropped off) in the middle, big highlighted captions below, and a short end card.
 */
export type ShortProps = {
  video: string;                 // file in public/
  parts: [number, number][];     // episode ranges (seconds) played back to back
  hook: [string, string];
  captions?: Line[];             // episode-timed caption lines (EP3), or …
  segments?: Segment[];          // … episode transcript to build them from (EP2)
  emph?: Emph;
  intro?: number;                // seconds of hook-only opening (for a recorded voice-over)
};

export const END = 2.5;          // seconds of end card after the clip
// Part of the 16:9 frame kept: below the chapter bar, above the episode's own caption.
const CROP = {x: 40, y: 92, w: 1840, h: 838};
const BOX_W = 1080;                // edge to edge: as large as the 16:9 picture can be

const fit = (text: string, max: number, width: number) => Math.min(max, Math.floor(width / (text.length * 0.92)));

export const shortLength = (parts: [number, number][]) => parts.reduce((a, [x, y]) => a + y - x, 0);

const ShortBody: React.FC<ShortProps> = ({video, parts, hook, captions, segments, emph}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const len = shortLength(parts);
  const offs = parts.map((_, i) => shortLength(parts.slice(0, i)));
  const lines = useMemo(() => {
    // Build caption lines only from transcript segments that are kept, so no cut-out words leak in.
    const kept = (segments ?? []).filter((g) => parts.some(([a, b]) => g.start >= a - 0.1 && g.end <= b + 0.2));
    const all = captions?.length ? holdLines(captions) : buildLines(kept);
    return parts.flatMap(([a, b], i) => all.filter((l) => l.e > a + 0.05 && l.s < b - 0.05)
      .map((l) => ({...l, s: offs[i] + Math.max(0, l.s - a), e: offs[i] + Math.min(b, l.e) - a})));
  }, [captions, segments, parts]);
  const line = t < len ? lines.find((l) => t >= l.s && t < l.e) : undefined;

  const k = BOX_W / CROP.w, boxH = CROP.h * k;
  const h1 = fit(hook[0], 66, 980), h2 = fit(hook[1], 84, 1000);
  const endP = enter(f, Math.round(len * FPS), 14);

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, wordBreak: 'keep-all',
      backgroundImage: 'radial-gradient(rgba(21,24,30,0.07) 1.6px, transparent 1.6px)', backgroundSize: '34px 34px'}}>
      {/* hook */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 300, textAlign: 'center'}}>
        <div style={{display: 'inline-block', fontSize: 30, fontWeight: 800, color: C.blue, background: C.blueSoft,
          borderRadius: 999, padding: '8px 26px', marginBottom: 34, transform: `scale(${pop(f, 2)})`}}>누보영어</div>
        <div style={{fontSize: h1, fontWeight: 700, color: C.ink, letterSpacing: -1.5, lineHeight: 1.25,
          opacity: enter(f, 4, 12)}}>{hook[0]}</div>
        <div style={{marginTop: 14, opacity: enter(f, 10, 12)}}>
          <span style={{position: 'relative', display: 'inline-block', fontSize: h2, fontWeight: 900, color: C.ink, letterSpacing: -2, lineHeight: 1.25}}>
            <span style={{position: 'absolute', left: -10, right: -10, bottom: '0.06em', height: '0.42em', background: C.yellow, borderRadius: 6,
              transformOrigin: 'left', transform: `scaleX(${enter(f, 16, 18)})`}} />
            <span style={{position: 'relative'}}>{hook[1]}</span>
          </span>
        </div>
      </div>

      {/* episode clip */}
      <div style={{position: 'absolute', left: (1080 - BOX_W) / 2, top: 700, width: BOX_W, height: boxH, overflow: 'hidden',
        background: C.bg, borderTop: `3px solid ${C.line}`, borderBottom: `3px solid ${C.line}`, boxShadow: '0 26px 60px rgba(20,30,50,0.12)'}}>
        {parts.map(([a, b], i) => (
        <Sequence key={i} from={Math.round(offs[i] * FPS)} durationInFrames={Math.round((b - a) * FPS)}>
          <OffthreadVideo src={staticFile(video)} startFrom={Math.round(a * FPS)}
            style={{position: 'absolute', width: 1920 * k, height: 1080 * k, left: -CROP.x * k, top: -CROP.y * k}} />
        </Sequence>
        ))}
      </div>

      {/* captions */}
      {line ? (
        <div style={{position: 'absolute', left: 60, right: 60, top: 700 + boxH + 70, display: 'flex', justifyContent: 'center'}}>
          <div style={{background: 'rgba(21,24,30,0.9)', color: '#fff', fontSize: 60, fontWeight: 700, letterSpacing: -1,
            lineHeight: 1.35, padding: '20px 36px', borderRadius: 22, textAlign: 'center', maxWidth: 960}}>{paint(line.text, emph)}</div>
        </div>
      ) : null}

      {/* end card */}
      {f >= Math.round(len * FPS) ? (
        <AbsoluteFill style={{background: `rgba(245,243,238,${0.94 * endP})`, alignItems: 'center', justifyContent: 'center'}}>
          <div style={{textAlign: 'center', opacity: endP, transform: `translateY(${(1 - endP) * 30}px)`}}>
            <div style={{fontSize: 50, fontWeight: 700, color: C.sub, letterSpacing: -1}}>이 외의 영어 풀이 꿀팁은</div>
            <div style={{display: 'inline-block', marginTop: 26, fontSize: 84, fontWeight: 900, color: '#fff', background: C.blue,
              borderRadius: 999, padding: '18px 56px', letterSpacing: -2, transform: `scale(${pop(f, Math.round(len * FPS) + 8)})`}}>누보쌤 팔로우</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/** Hook alone, large and centred: room for a voice-over before the clip starts. */
const IntroHook: React.FC<{hook: [string, string]}> = ({hook}) => {
  const f = useCurrentFrame();
  const h1 = fit(hook[0], 84, 980), h2 = fit(hook[1], 96, 1000);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, wordBreak: 'keep-all', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(rgba(21,24,30,0.07) 1.6px, transparent 1.6px)', backgroundSize: '34px 34px'}}>
      <div style={{textAlign: 'center', padding: '0 40px', marginTop: -120}}>
        <div style={{display: 'inline-block', fontSize: 34, fontWeight: 800, color: C.blue, background: C.blueSoft,
          borderRadius: 999, padding: '10px 30px', marginBottom: 46, transform: `scale(${pop(f, 0)})`}}>누보영어</div>
        <div style={{fontSize: h1, fontWeight: 700, color: C.ink, letterSpacing: -2, lineHeight: 1.25, opacity: enter(f, 2, 12),
          transform: `translateY(${(1 - enter(f, 2, 12)) * 24}px)`}}>{hook[0]}</div>
        <div style={{marginTop: 22, opacity: enter(f, 10, 12), transform: `translateY(${(1 - enter(f, 10, 12)) * 24}px)`}}>
          <span style={{position: 'relative', display: 'inline-block', fontSize: h2, fontWeight: 900, color: C.ink, letterSpacing: -2.5, lineHeight: 1.25}}>
            <span style={{position: 'absolute', left: -12, right: -12, bottom: '0.06em', height: '0.42em', background: C.yellow, borderRadius: 8,
              transformOrigin: 'left', transform: `scaleX(${enter(f, 20, 20)})`}} />
            <span style={{position: 'relative'}}>{hook[1]}</span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Short: React.FC<ShortProps> = (p) => {
  const I = Math.round((p.intro ?? 0) * FPS);
  return (
    <AbsoluteFill>
      {I > 0 ? <Sequence durationInFrames={I}><IntroHook hook={p.hook} /></Sequence> : null}
      <Sequence from={I}><ShortBody {...p} /></Sequence>
    </AbsoluteFill>
  );
};
