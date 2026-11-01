import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {enter, pop, rise, sec} from '../anim';
import {PassageMark, Scene} from '../types';
import {Frame, Heading} from './Frame';

type P<T extends Scene['type']> = {s: Extract<Scene, {type: T}>; len: number};
const at = (s: Scene, t: number) => sec(t - s.start);
const PEN: Record<string, string> = {red: C.red, blue: C.blue, yellow: C.yellow};

/** Horizontal share bar: e.g. 단어 4 : 해석 5 : 듣기 1. */
export const RatioScene: React.FC<P<'ratio'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const total = s.parts.reduce((a, p) => a + p.value, 0);
  const palette = [C.blue, '#5B8CF0', '#A9C1F5', C.red];
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'flex', gap: 14, height: 300}}>
        {s.parts.map((p, i) => {
          const q = enter(f, at(s, p.t), 22);
          return (
            <div key={i} style={{flex: p.value / total, display: 'flex', flexDirection: 'column', gap: 18, opacity: q}}>
              <div style={{height: 190, borderRadius: 24, background: p.color ?? palette[i % palette.length],
                transformOrigin: 'left', transform: `scaleX(${q})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{fontSize: 110, fontWeight: 900, color: '#fff', letterSpacing: -3}}>{p.value}</span>
              </div>
              <div style={{fontSize: 44, fontWeight: 800, textAlign: 'center', ...rise(q, 16)}}>{p.label}</div>
            </div>
          );
        })}
      </div>
      {s.foot ? (
        <div style={{position: 'absolute', left: 120, right: 120, top: 720, textAlign: 'center', fontSize: 46, fontWeight: 800,
          color: C.red, ...rise(enter(f, at(s, s.foot.t)))}}>{s.foot.text}</div>
      ) : null}
    </Frame>
  );
};

/** Vocabulary flash cards: English word, meaning hidden until revealAt, ✓ / ? badge. */
export const WordCardScene: React.FC<P<'wordcard'>> = ({s, len}) => {
  const f = useCurrentFrame();
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 290, display: 'flex', gap: 40, justifyContent: 'center'}}>
        {s.cards.map((c, i) => {
          const p = pop(f, at(s, c.t));
          const shown = c.revealAt !== undefined && f >= at(s, c.revealAt);
          const r = c.revealAt !== undefined ? enter(f, at(s, c.revealAt), 14) : 0;
          const m = c.mark ? pop(f, at(s, c.markAt ?? c.t + 0.6)) : 0;
          const good = c.mark === 'check';
          return (
            <div key={i} style={{position: 'relative', width: 640, background: C.card, borderRadius: 28, padding: '54px 40px 46px',
              border: `3px solid ${c.mark && m > 0.5 ? (good ? C.blue : C.red) : C.line}`, boxShadow: '0 16px 40px rgba(20,30,50,0.10)',
              opacity: Math.max(0, p), transform: `translateY(${(1 - p) * 30}px)`}}>
              <div style={{fontSize: 92, fontWeight: 800, textAlign: 'center', letterSpacing: -1}}>{c.en}</div>
              <div style={{marginTop: 30, height: 86, borderRadius: 16, background: shown ? 'transparent' : '#E9E6DF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'}}>
                {!shown ? <span style={{fontSize: 30, fontWeight: 700, color: '#9AA0AB'}}>뜻 가리기</span> : null}
                <span style={{position: 'absolute', fontSize: 54, fontWeight: 800, color: C.sub, opacity: r, transform: `translateY(${(1 - r) * 20}px)`}}>{c.ko}</span>
              </div>
              {c.mark ? (
                <div style={{position: 'absolute', top: -34, right: -26, width: 92, height: 92, borderRadius: 46,
                  background: good ? C.blue : C.red, color: '#fff', fontSize: 56, fontWeight: 900, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, m)})`,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.15)'}}>{good ? '✓' : '?'}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      {s.note ? (
        <div style={{position: 'absolute', left: 120, right: 120, top: 720, textAlign: 'center', fontSize: 44, fontWeight: 700,
          ...rise(enter(f, at(s, s.note.t)))}}>{s.note.text}</div>
      ) : null}
    </Frame>
  );
};

/** Study plan table: when → what. */
export const PlanScene: React.FC<P<'plan'>> = ({s, len}) => {
  const f = useCurrentFrame();
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 270, display: 'flex', flexDirection: 'column', gap: 20}}>
        {s.rows.map((r, i) => {
          const p = pop(f, at(s, r.t));
          return (
            <div key={i} style={{display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: 22, overflow: 'hidden',
              border: `3px solid ${r.accent ? C.blue : C.line}`, background: C.card, opacity: Math.max(0, p),
              transform: `translateX(${(1 - p) * -40}px)`, boxShadow: '0 6px 18px rgba(0,0,0,0.05)'}}>
              <div style={{width: 300, background: r.accent ? C.blue : C.blueSoft, color: r.accent ? '#fff' : C.blue,
                fontSize: 40, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 10px'}}>{r.when}</div>
              <div style={{flex: 1, padding: '24px 36px'}}>
                <div style={{fontSize: 44, fontWeight: 700, letterSpacing: -0.8}}>{r.what}</div>
                {r.sub ? <div style={{fontSize: 30, fontWeight: 500, color: C.sub, marginTop: 6}}>{r.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** English passage, typeset cleanly, with pen annotations drawn in time with the narration. */
export const PassageScene: React.FC<P<'passage'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const words = s.text.split(' ');
  const fs = s.size ?? (s.text.length > 150 && s.notes?.length ? 42 : 52);
  const marks = s.marks.map((m) => ({...m, p: enter(f, at(s, m.t), 14)}));
  const of = (i: number) => marks.filter((m) =>
    ('from' in m && i >= m.from && i <= m.to) || ('at' in m && m.at === i) || ('after' in m && m.after === i));
  const hasNotes = !!s.notes?.length;
  const lh = fs <= 44 ? 1.95 : 2.05;
  return (
    <Frame label={s.label} len={len}>
      {s.heading ? <Heading text={s.heading} /> : null}
      <div style={{position: 'absolute', left: 120, right: hasNotes ? 640 : 120, top: s.heading ? 270 : 170, background: C.card,
        borderRadius: 28, padding: fs <= 44 ? '48px 52px' : '64px 60px', boxShadow: '0 20px 50px rgba(20,30,50,0.10)', border: `3px solid ${C.line}`,
        opacity: enter(f, 2, 18)}}>
        <div style={{fontSize: fs, lineHeight: lh, fontWeight: 500, color: C.ink, letterSpacing: -0.2}}>
          {words.map((w, i) => {
            const ms = of(i);
            const brOpen = ms.filter((m) => m.kind === 'bracket' && 'from' in m && m.from === i);
            const brClose = ms.filter((m) => m.kind === 'bracket' && 'to' in m && m.to === i);
            return (
              <React.Fragment key={i}>
                {brOpen.map((m, k) => (
                  <span key={`bo${k}`} style={{position: 'relative', display: 'inline-block', color: C.red, fontWeight: 800, opacity: m.p, marginRight: 4}}>
                    {'text' in m && m.text ? <Tag text={m.text} p={m.p} color={C.red} /> : null}(
                  </span>
                ))}
                {w === '/' ? (
                  <span style={{display: 'inline-block', color: C.red, fontWeight: 900, fontSize: fs * 1.15, margin: '0 4px', transform: 'rotate(8deg)'}}>/</span>
                ) : (
                <span style={{position: 'relative', display: 'inline-block', padding: '0 2px'}}>
                  {ms.map((m, k) => <Ink key={k} m={m} first={'from' in m && m.from === i} last={'to' in m && m.to === i} />)}
                  <span style={{position: 'relative'}}>{w}</span>
                  {ms.filter((m) => m.kind === 'label').map((m, k) => (
                    <Tag key={`l${k}`} text={(m as {text: string}).text} p={m.p} color={PEN[(m as {color?: string}).color ?? 'red']} />
                  ))}
                </span>
                )}
                {brClose.map((m, k) => <span key={`bc${k}`} style={{color: C.red, fontWeight: 800, opacity: m.p, marginLeft: 2}}>)</span>)}
                {ms.filter((m) => m.kind === 'slash').map((m, k) => {
                  const ma = (m as {markAt?: number}).markAt;
                  const fr = ma === undefined ? -1 : f - at(s, ma);
                  const bump = fr > 0 && fr < 20 ? Math.sin((Math.PI * fr) / 20) * 0.7 : 0;
                  const tp = ma === undefined ? 0 : enter(f, at(s, ma), 12);
                  return (
                    <span key={`s${k}`} style={{position: 'relative', display: 'inline-block', margin: '0 6px'}}>
                      <span style={{display: 'inline-block', color: C.red, fontWeight: 900, fontSize: fs * 1.15,
                        transform: `scale(${m.p * (1 + bump)}) rotate(8deg)`, opacity: m.p}}>/</span>
                      {ma !== undefined ? <Tag text="여기서 끊기" p={tp} color={C.red} /> : null}
                    </span>
                  );
                })}
                {ms.filter((m) => m.kind === 'noslash').map((m, k) => {
                  const x = enter(f, at(s, (m as {markAt: number}).markAt), 12);
                  return (
                    <span key={`n${k}`} style={{position: 'relative', display: 'inline-block', margin: '0 6px', opacity: m.p}}>
                      <span style={{display: 'inline-block', color: '#9AA3AF', fontWeight: 900, fontSize: fs * 1.15,
                        transform: `scale(${m.p}) rotate(8deg)`}}>/</span>
                      <span style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${x})`, opacity: x,
                        color: C.red, fontWeight: 900, fontSize: fs * 1.25, lineHeight: 1}}>✕</span>
                      <Tag text="끊지 않음" p={x} color={C.red} />
                    </span>
                  );
                })}{' '}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {hasNotes ? (
        <div style={{position: 'absolute', right: 100, width: 500, top: s.heading ? 270 : 170, display: 'flex', flexDirection: 'column', gap: 18}}>
          {s.notes!.map((n, i) => {
            const q = pop(f, at(s, n.t));
            return (
              <div key={i} style={{opacity: Math.max(0, q), transform: `translateX(${(1 - q) * 30}px)`, background: C.card,
                borderLeft: `8px solid ${n.color === 'red' ? C.red : C.blue}`, borderRadius: 14, padding: '20px 24px', fontSize: 34,
                fontWeight: 700, lineHeight: 1.3, boxShadow: '0 6px 18px rgba(0,0,0,0.05)'}}>{n.text}</div>
            );
          })}
        </div>
      ) : null}
    </Frame>
  );
};

const Tag: React.FC<{text: string; p: number; color: string}> = ({text, p, color}) => (
  <span style={{position: 'absolute', left: '50%', top: '-0.95em', transform: `translateX(-50%) scale(${p})`, fontSize: '0.5em',
    fontWeight: 800, color: '#fff', background: color, borderRadius: 8, padding: '2px 10px', whiteSpace: 'nowrap', lineHeight: 1.3}}>{text}</span>
);

/** One word's share of a range mark: highlighter behind, underline/strike line, or circle segment. */
const Ink: React.FC<{m: PassageMark & {p: number}; first: boolean; last: boolean}> = ({m, first, last}) => {
  const col = PEN[('color' in m && m.color) || (m.kind === 'highlight' ? 'yellow' : 'red')];
  const p = m.p;
  if (m.kind === 'highlight')
    return <span style={{position: 'absolute', left: 0, right: last ? 0 : -18, top: '22%', bottom: '18%', background: col,
      opacity: 0.75, transformOrigin: 'left', transform: `scaleX(${p})`, borderRadius: 6}} />;
  if (m.kind === 'underline')
    return <span style={{position: 'absolute', left: 0, right: last ? 0 : -18, bottom: '12%', height: 5, background: col,
      transformOrigin: 'left', transform: `scaleX(${p})`, borderRadius: 3}} />;
  if (m.kind === 'strike')
    return <span style={{position: 'absolute', left: 0, right: 0, top: '52%', height: 5, background: col,
      transformOrigin: 'left', transform: `scaleX(${p})`, borderRadius: 3}} />;
  if (m.kind === 'circle')
    return <span style={{position: 'absolute', left: first ? -6 : 0, right: last ? -6 : -14, top: '14%', bottom: '10%',
      border: `4px solid ${col}`, borderLeftWidth: first ? 4 : 0, borderRightWidth: last ? 4 : 0,
      borderRadius: `${first ? 40 : 0}px ${last ? 40 : 0}px ${last ? 40 : 0}px ${first ? 40 : 0}px`, opacity: p,
      transform: `scale(${interpolate(p, [0, 1], [1.15, 1])})`}} />;
  return null;
};

export {AbsoluteFill};
