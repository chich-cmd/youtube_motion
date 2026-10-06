import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import pieces from '../data/pieces.json';
import {C} from '../theme';
import {enter, pop, rise, sec} from '../anim';
import {Scene} from '../types';
import {Frame, Heading} from './Frame';

type P<T extends Scene['type']> = {s: Extract<Scene, {type: T}>; len: number};
const at = (s: Scene, t: number) => sec(t - s.start);

/** Yellow highlighter sweep behind a phrase. */
const Marker: React.FC<{p: number; color?: string; children: React.ReactNode}> = ({p, color = C.yellow, children}) => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    <span style={{position: 'absolute', left: -6, right: -6, bottom: '0.08em', height: '0.42em', background: color,
      transformOrigin: 'left', transform: `scaleX(${p})`, borderRadius: 4, zIndex: 0}} />
    <span style={{position: 'relative'}}>{children}</span>
  </span>
);

export const TitleScene: React.FC<P<'title'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const words = s.title.split(' ');
  return (
    <Frame len={len}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 36, paddingBottom: 80}}>
        <div style={{...rise(enter(f, 0)), fontSize: 30, fontWeight: 700, color: C.blue, background: C.blueSoft,
          padding: '12px 26px', borderRadius: 999}}>{s.kicker}</div>
        <div style={{fontSize: 108, fontWeight: 900, letterSpacing: -3, textAlign: 'center', lineHeight: 1.15, maxWidth: 1500}}>
          {words.map((w, i) => (
            <span key={i} style={{display: 'inline-block', marginRight: '0.28em', ...rise(enter(f, 6 + i * 4), 50)}}>{w}</span>
          ))}
        </div>
        {s.sub ? (
          <div style={{...rise(enter(f, s.subAt ? at(s, s.subAt) : 30)), fontSize: 40, fontWeight: 500, color: C.sub}}>{s.sub}</div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};

export const SectionScene: React.FC<P<'section'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const p = enter(f, 0, 24);
  return (
    <Frame len={len}>
      <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 200, paddingBottom: 80}}>
        <div style={{fontSize: 220, fontWeight: 900, color: C.blue, lineHeight: 1, letterSpacing: -6,
          opacity: p, transform: `translateX(${(1 - p) * -60}px)`}}>{s.index}</div>
        <div style={{height: 8, width: 160 * enter(f, 8, 20), background: C.ink, margin: '28px 0 32px', borderRadius: 4}} />
        <div style={{...rise(enter(f, 10)), fontSize: 96, fontWeight: 800, letterSpacing: -2.5}}>{s.title}</div>
        {s.sub ? <div style={{...rise(enter(f, 18)), fontSize: 40, fontWeight: 500, color: C.sub, marginTop: 18}}>{s.sub}</div> : null}
      </AbsoluteFill>
    </Frame>
  );
};

export const ListScene: React.FC<P<'list'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const two = s.columns === 2;
  const shown = s.items.filter((it) => f >= at(s, it.t));
  const current = shown.length - 1;
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 270, display: 'grid',
        gridTemplateColumns: two ? '1fr 1fr' : '1fr', gap: 22}}>
        {s.items.map((it, i) => {
          const p = pop(f, at(s, it.t));
          const active = i === current;
          const hl = it.accent || active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: C.card, borderRadius: 22,
              padding: '26px 34px', border: `3px solid ${hl ? C.blue : C.line}`,
              boxShadow: hl ? '0 14px 34px rgba(43,99,217,0.16)' : '0 4px 14px rgba(0,0,0,0.04)',
              opacity: Math.max(0, p) * (i < current && !it.accent ? 0.72 : 1),
              transform: `translateY(${(1 - p) * 30}px) scale(${0.96 + 0.04 * p})`}}>
              <div style={{minWidth: 76, height: 76, borderRadius: 18, background: hl ? C.blue : C.blueSoft,
                color: hl ? '#fff' : C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: (it.badge ?? '').length > 3 ? 26 : 34, fontWeight: 800, padding: '0 14px'}}>{it.badge ?? i + 1}</div>
              <div style={{flex: 1}}>
                <div style={{fontSize: 46, fontWeight: 700, letterSpacing: -1}}>{it.text}</div>
                {it.sub ? <div style={{fontSize: 30, fontWeight: 500, color: C.sub, marginTop: 6}}>{it.sub}</div> : null}
              </div>
              {it.tags?.map((t) => (
                <div key={t} style={{fontSize: 28, fontWeight: 700, color: C.red, background: C.redSoft, padding: '10px 20px', borderRadius: 999}}>{t}</div>
              ))}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

export const StatScene: React.FC<P<'stat'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const p = pop(f, 4);
  const num = Number(s.value.replace(/,/g, ''));
  const counting = s.countFrom !== undefined && !Number.isNaN(num);
  const shown = counting
    ? Math.round(interpolate(enter(f, 4, 40), [0, 1], [s.countFrom!, num])).toLocaleString('en-US')
    : s.value;
  return (
    <Frame label={s.label} len={len}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingBottom: 90}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18, transform: `scale(${0.85 + 0.15 * p})`, opacity: p}}>
          <span style={{fontSize: 280, fontWeight: 900, letterSpacing: -10, color: C.blue, lineHeight: 1}}>{shown}</span>
          {s.unit ? <span style={{fontSize: 110, fontWeight: 800, color: C.ink}}>{s.unit}</span> : null}
        </div>
        <div style={{...rise(enter(f, 16)), fontSize: 54, fontWeight: 700, marginTop: 30, letterSpacing: -1}}>{s.caption}</div>
      </AbsoluteFill>
    </Frame>
  );
};

export const QuoteScene: React.FC<P<'quote'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const mAt = s.markAt ? at(s, s.markAt) : 24;
  const render = (line: string) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let k = 0;
    while (rest.length) {
      const hit = (s.marks ?? []).map((m) => ({m, i: rest.indexOf(m)})).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0];
      if (!hit) { parts.push(rest); break; }
      if (hit.i > 0) parts.push(rest.slice(0, hit.i));
      parts.push(<Marker key={k++} p={enter(f, mAt + k * 6, 16)}>{hit.m}</Marker>);
      rest = rest.slice(hit.i + hit.m.length);
    }
    return parts;
  };
  return (
    <Frame label={s.label} len={len}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 14, paddingBottom: 90}}>
        <div style={{fontSize: 160, fontWeight: 900, color: C.blue, lineHeight: 0.6, opacity: enter(f, 0)}}>“</div>
        {s.lines.map((l, i) => (
          <div key={i} style={{...rise(enter(f, 4 + i * 6)), fontSize: 76, fontWeight: 800, letterSpacing: -2, textAlign: 'center'}}>{render(l)}</div>
        ))}
      </AbsoluteFill>
    </Frame>
  );
};

export const FootageScene: React.FC<P<'footage'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const p = enter(f, 4, 22);
  // Crop to the paper in the source frame (1920x1080): roughly x 290–1630, y 85–825.
  const crop = {x: 290, y: 85, w: 1340, h: 740};
  const W = 1080, H = (W * crop.h) / crop.w, k = W / crop.w;
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, top: 270, width: W, height: H, borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(20,30,50,0.18)', border: `3px solid ${C.line}`, background: '#fff',
        opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
        {/* Follow the edit: one clip per kept source range overlapping this scene. */}
        {pieces.filter((p) => p.at < s.end && p.at + p.dur > s.start).map((p, i) => {
          const from = Math.max(0, sec(p.at - s.start));
          const skip = Math.max(0, s.start - p.at);
          const d = sec(Math.min(p.at + p.dur, s.end) - s.start) - from;
          return d > 0 ? (
            <Sequence key={i} from={from} durationInFrames={d}>
              <OffthreadVideo src={staticFile('original.mp4')} startFrom={sec(p.from + skip * ((p as {rate?: number}).rate ?? 1))}
                playbackRate={(p as {rate?: number}).rate ?? 1} muted
                style={{position: 'absolute', width: 1920 * k, height: 1080 * k, left: -crop.x * k, top: -crop.y * k}} />
            </Sequence>
          ) : null;
        })}
      </div>
      <div style={{position: 'absolute', left: 1250, right: 100, top: 270, display: 'flex', flexDirection: 'column', gap: 18}}>
        {s.notes.map((n, i) => {
          const q = pop(f, at(s, n.t));
          const col = n.color === 'red' ? C.red : C.blue;
          return (
            <div key={i} style={{opacity: Math.max(0, q), transform: `translateX(${(1 - q) * 30}px)`, background: C.card,
              borderLeft: `8px solid ${col}`, borderRadius: 14, padding: '20px 24px', fontSize: 34, fontWeight: 700,
              letterSpacing: -0.5, lineHeight: 1.3, boxShadow: '0 6px 18px rgba(0,0,0,0.05)'}}>{n.text}</div>
          );
        })}
      </div>
    </Frame>
  );
};

export const TimelineScene: React.FC<P<'timeline'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const left = 300, width = 1380;
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 280, display: 'flex', flexDirection: 'column', gap: 26}}>
        {s.days.map((d, i) => {
          const a = at(s, d.t);
          const p = enter(f, a, 26);
          const from = d.from ?? 0;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', opacity: f >= a ? 1 : 0}}>
              <div style={{width: left - 120, fontSize: 40, fontWeight: 800}}>{d.day}</div>
              <div style={{position: 'relative', width, height: 64, background: '#ECE9E2', borderRadius: 14, overflow: 'hidden'}}>
                <div style={{position: 'absolute', top: 0, bottom: 0, left: `${(from / s.total) * 100}%`,
                  width: `${((d.to - from) / s.total) * 100 * p}%`, background: i === s.days.length - 1 ? C.blue : '#8FAEEA', borderRadius: 14}} />
                <div style={{position: 'absolute', right: 20, top: 0, bottom: 0, display: 'flex', alignItems: 'center',
                  fontSize: 32, fontWeight: 800, color: C.ink}}>{`${from + 1} – ${Math.round(from + (d.to - from) * p)}`}</div>
              </div>
            </div>
          );
        })}
      </div>
      {s.foot ? (
        <div style={{position: 'absolute', left: 120, right: 120, bottom: 200, textAlign: 'center', fontSize: 44, fontWeight: 800,
          color: C.red, ...rise(enter(f, at(s, s.foot.t)))}}>{s.foot.text}</div>
      ) : null}
    </Frame>
  );
};

export const CompareScene: React.FC<P<'compare'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const col = (side: typeof s.left, good: boolean) => {
    const p = pop(f, at(s, side.t));
    const c = good ? C.blue : C.red;
    return (
      <div style={{flex: 1, background: C.card, borderRadius: 26, padding: '40px 46px', border: `3px solid ${good ? C.blue : C.line}`,
        opacity: Math.max(0, p), transform: `translateY(${(1 - p) * 30}px)`}}>
        <div style={{fontSize: 44, fontWeight: 800, color: c, marginBottom: 26}}>{good ? '○ ' : '✕ '}{side.title}</div>
        {side.items.map((t, i) => (
          <div key={i} style={{fontSize: 36, fontWeight: 600, marginTop: 14, color: C.ink}}>· {t}</div>
        ))}
      </div>
    );
  };
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 280, display: 'flex', gap: 40}}>
        {col(s.left, false)}
        {col(s.right, s.right.good ?? true)}
      </div>
    </Frame>
  );
};
