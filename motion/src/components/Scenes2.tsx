import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {withHl} from './Scenes';
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
/** Source screen recording (cropped to the exam page) on the left, step cards on the right. */
export const ClipScene: React.FC<P<'clip'>> = ({s, len}) => {
  const f = useCurrentFrame();
  const c = s.clip;
  const ch0 = c.h ?? 900;
  const k = Math.min(800 / ch0, 960 / c.w), H0 = ch0 * k, W = c.w * k;  // fit the whole page; never crop it
  // After `shift.t` (output seconds, remapped by the build) the recording scrolled: skip a black band at the top, keep the same zoom.
  const sh = c.shift && f >= at(s, c.shift.t) ? c.shift : null;
  const cy = sh ? sh.y : c.y ?? 0, H = sh ? sh.h * k : H0;
  const p = enter(f, 2, 16);
  const shown = s.items.filter((it) => f >= at(s, it.t));
  const current = shown.length - 1;
  return (
    <Frame label={s.label} len={len}>
      <div style={{position: 'absolute', left: 70, top: 120, width: W, height: H, borderRadius: 22, overflow: 'hidden', background: '#fff',
        border: `3px solid ${C.line}`, boxShadow: '0 24px 60px rgba(20,30,50,0.16)', opacity: p}}>
        <OffthreadVideo src={staticFile(c.src ?? 'ep3_src.mp4')} startFrom={Math.round(c.from * 30)} muted
          style={{position: 'absolute', width: 1920 * k, height: 1080 * k, left: -c.x * k, top: -cy * k}} />
        {(c.masks ?? []).filter((m) => c.from + f / 30 >= m.s - 0.1 && c.from + f / 30 < m.e + 0.1).map((m, i) => (
          <div key={i} style={{position: 'absolute', left: (m.x0 - c.x) * k, top: (m.y0 - cy) * k, width: (m.x1 - m.x0) * k, height: (m.y1 - m.y0) * k,
            background: '#fff', borderRadius: 8, boxShadow: '0 0 10px 6px #fff'}} />
        ))}
      </div>
      <div style={{position: 'absolute', left: 70 + W + 50, right: 70, top: 120, display: 'flex', flexDirection: 'column', gap: 16}}>
        <div style={{fontSize: 54, fontWeight: 800, letterSpacing: -1.5, color: C.ink, marginBottom: 10,
          opacity: enter(f, 0, 12), transform: `translateY(${(1 - enter(f, 0, 12)) * 16}px)`}}>{s.heading}</div>
        {s.items.map((it, i) => {
          const q = pop(f, at(s, it.t));
          const hl = it.accent || i === current;
          return (
            <div key={i} style={{display: 'flex', gap: 18, alignItems: 'flex-start', background: C.card, borderRadius: 18, padding: '18px 22px',
              border: `3px solid ${hl ? C.blue : C.line}`, boxShadow: hl ? '0 12px 28px rgba(43,99,217,0.14)' : '0 4px 12px rgba(0,0,0,0.04)',
              opacity: Math.max(0, q) * (i < current && !it.accent ? 0.75 : 1), transform: `translateX(${(1 - q) * 30}px)`}}>
              <div style={{minWidth: 54, height: 54, borderRadius: 14, background: hl ? C.blue : C.blueSoft, color: hl ? '#fff' : C.blue,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: (it.badge ?? '').length > 2 ? 20 : 28, fontWeight: 800, padding: '0 8px'}}>{it.badge ?? i + 1}</div>
              <div style={{flex: 1}}>
                <div style={{fontSize: 34, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.3}}>{withHl(it.text, it.hl, f, s)}
                  {it.tags?.map((t) => <span key={t} style={{marginLeft: 12, fontSize: 22, fontWeight: 800, color: C.red, background: C.redSoft,
                    padding: '4px 12px', borderRadius: 999, verticalAlign: 'middle'}}>{t}</span>)}</div>
                {it.sub ? <div style={{fontSize: 24, fontWeight: 500, color: C.sub, marginTop: 6, lineHeight: 1.35}}>{withHl(it.sub, it.hl, f, s)}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** Silent on-screen notice: a badge and a few centred lines, revealed one by one. */
export const NoticeScene: React.FC<P<'notice'>> = ({s, len}) => {
  const f = useCurrentFrame();
  return (
    <Frame label={s.label} len={len}>
      <div style={{position: 'absolute', left: 200, right: 200, top: 190, bottom: 190, background: C.card, borderRadius: 32,
        border: `3px solid ${C.line}`, boxShadow: '0 20px 50px rgba(20,30,50,0.10)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 34, padding: '0 80px', opacity: enter(f, 0, 14)}}>
        <div style={{fontSize: 36, fontWeight: 800, color: '#fff', background: C.blue, borderRadius: 999, padding: '10px 34px',
          transform: `scale(${pop(f, 4)})`}}>📌 {s.badge ?? '안내'}</div>
        {s.lines.map((l, i) => {
          const p = enter(f, 14 + i * 22, 16);
          const acc = i === s.accentLine;
          return (
            <div key={i} style={{fontSize: acc ? 50 : 48, fontWeight: acc ? 800 : 600, color: acc ? C.blue : C.ink, textAlign: 'center',
              lineHeight: 1.4, letterSpacing: -0.8, opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>{l}</div>
          );
        })}
      </div>
    </Frame>
  );
};

export const PlanScene: React.FC<P<'plan'>> = ({s, len}) => {
  const f = useCurrentFrame();
  return (
    <Frame label={s.label} len={len}>
      <Heading text={s.heading} />
      {s.badge ? <div style={{position: 'absolute', right: 120, top: 150, fontSize: 34, fontWeight: 800, color: C.red, background: C.redSoft,
        border: `3px solid ${C.red}`, borderRadius: 999, padding: '12px 30px', transform: `scale(${pop(f, 10)}) rotate(-2deg)`}}>{s.badge}</div> : null}
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
                <div style={{fontSize: 44, fontWeight: 700, letterSpacing: -0.8, display: 'flex', alignItems: 'center', gap: 16}}>
                  {r.tag ? <span style={{fontSize: 26, fontWeight: 800, color: C.blue, background: C.blueSoft, borderRadius: 10, padding: '4px 14px'}}>{r.tag}</span> : null}{r.what}</div>
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
  const marks = s.marks.map((m) => ({...m, p: enter(f, at(s, m.t), 14) * (m.until === undefined ? 1 : 1 - enter(f, at(s, m.until), 10))}));
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
                      {(m as {quiet?: boolean}).quiet ? null : <Tag text="끊지 않음" p={x * (1 - enter(f, at(s, (m as {markAt: number}).markAt + 3), 10))} color={C.red} below />}
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

const Tag: React.FC<{text: string; p: number; color: string; below?: boolean}> = ({text, p, color, below}) => (
  <span style={{position: 'absolute', left: '50%', top: below ? '4.3em' : '-0.95em', transform: `translateX(-50%) scale(${p})`, fontSize: '0.5em',
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
