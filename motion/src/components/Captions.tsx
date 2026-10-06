import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT, FPS} from '../theme';
import {Segment} from '../types';

type Line = {s: number; e: number; text: string};
type W = {s: number; e: number; w: string; segEnd: boolean};

const TARGET = 15, MAX = 24;
// Korean endings where a spoken phrase naturally pauses (clause / connective endings).
const CLAUSE = /(면|고|데|서|니까|지만|는데|해서|려면|라도|든|며|요|죠|다|네|게|듯|도록|자|위해|위해서|통해|통해서|대해서|는지|을지|인지|테니|들어|들면)[,?!]?$/;
// Particles: acceptable but weaker break points.
const PARTICLE = /(은|는|이|가|을|를|에|에서|로|으로|도|만|랑|부터|까지|처럼|보다)$/;
// Words that must not end a line (conjunctions, noun-joining particles, dangling modifiers).
const BAD = /^(또는|및|혹은|그리고|그래서|그런데|근데|그럼|그러면|그러면은|이|그|저|좀|더|안|못|뭐|이제|진짜|정말|어떻게|왜|또|너무|그냥|딱|꼭|잘|다시|한|몇|크게|많이|아주|가장|제일|바로|계속|먼저|일단|이렇게|그렇게|내가|여기|열심히)$|(와|과|의)$|^\d+에서$/;
// Short connective pieces that belong to the *next* phrase.
const LEAD = /^(그리고|그러면|그러면은|그럼|그래서|근데|일단|또는|자|\d+번은?)$/;
const NOUNEND = /(경우|때|거|것|건|뒤|후|전|중)$/;
// Words that naturally start a new phrase: breaking right before them reads well.
const STARTER = /^(이렇게|그렇게|그리고|그래서|예를|즉|아니면|그러면|그럼|근데|그런데|만약|혹시)$/;

const clean = (t: string) => t.replace(/\./g, '').trim();

/** Cost of ending a caption line after word `w` (lower = more natural). */
const breakCost = (w: W, next?: W) => {
  const t = w.w.trim();
  if (next && STARTER.test(next.w.trim()) && !BAD.test(t)) return 1;
  if (/[?!]$/.test(t)) return 0;
  if (/,$/.test(t)) return 2;
  if (BAD.test(t)) return 25;
  if (CLAUSE.test(t)) return 1;
  if (w.segEnd) return 2;
  if (NOUNEND.test(t)) return 3;
  if (PARTICLE.test(t)) return 5;
  return 10;
};

/**
 * Group transcript into spoken sentences (merge short fragments said in one breath), then split each
 * sentence into lines at natural break points with a DP that balances length against break quality.
 */
export const buildLines = (segs: Segment[]): Line[] => {
  const groups: W[][] = [];
  let cur: W[] = [];
  let curLen = 0;
  let prevSegText = '';
  let glue = false;
  for (const seg of segs) {
    const ws = (seg.words.length ? seg.words : [{s: seg.start, e: seg.end, w: seg.text}])
      .map((w) => ({...w, w: clean(w.w), segEnd: false}))
      .filter((w) => w.w);
    if (!ws.length) continue;
    ws[ws.length - 1].segEnd = true;
    const last = cur[cur.length - 1];
    const len = ws.reduce((a, w) => a + w.w.length + 1, 0);
    const text = ws.map((w) => w.w).join(' ');
    // Merge only tiny fragments said in the same breath; never across a sentence end.
    const prevText = cur.map((w) => w.w).join(' ');
    const ended = /(다|요|죠|까|네|[.?!])$/.test(prevSegText);
    const tiny = len <= 6 || prevText.length <= 6;
    const leadIn = glue;                                  // previous piece was a lead-in like "그리고"
    if (last && !leadIn && (ended || !tiny || LEAD.test(text) || CLAUSE.test(prevSegText.replace(/[,.]$/, '')) && len <= 6
        || ws[0].s - last.e > 0.5 || curLen + len > MAX + 1)) { groups.push(cur); cur = []; curLen = 0; }
    glue = LEAD.test(text);
    cur.push(...ws); curLen += len; prevSegText = seg.text.trim();
  }
  if (cur.length) groups.push(cur);

  const out: Line[] = [];
  for (const g of groups) {
    const n = g.length;
    const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(0);
    best[0] = 0;
    for (let j = 1; j <= n; j++) {
      for (let i = j - 1; i >= 0; i--) {
        const text = g.slice(i, j).map((w) => w.w).join(' ');
        if (text.length > MAX && j - i > 1) break;
        const short = text.length < 6 && n > 1 ? 12 : 0;             // avoid tiny orphan lines
        const c = best[i] + (text.length - TARGET) ** 2 / 12 + short + (j < n ? breakCost(g[j - 1], g[j]) : 0) + 3;
        if (c < best[j]) { best[j] = c; prev[j] = i; }
      }
    }
    const cuts: [number, number][] = [];
    for (let j = n; j > 0; j = prev[j]) cuts.unshift([prev[j], j]);
    for (const [i, j] of cuts) {
      const text = g.slice(i, j).map((w) => w.w).join(' ').replace(/,$/, '');
      out.push({s: g[i].s, e: g[j - 1].e, text});
    }
  }
  // Drop exact repeats (e.g. a doubled closing line).
  const uniq = out.filter((l, i) => i === 0 || l.text !== out[i - 1].text);
  out.length = 0; out.push(...uniq);
  // Hold each line until the next one starts (max +0.6s) to avoid flicker.
  return out.map((l, i) => ({...l, e: Math.min(Math.max(l.e, (out[i + 1]?.s ?? l.e + 0.6) - 0.02), l.e + 0.6)}));
};

export const Captions: React.FC<{segments: Segment[]}> = ({segments}) => {
  const f = useCurrentFrame();
  const lines = useMemo(() => buildLines(segments), [segments]);
  const t = f / FPS;
  const line = lines.find((l) => t >= l.s && t < l.e);
  if (!line) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', fontFamily: FONT}}>
      <div style={{background: 'rgba(21,24,30,0.88)', color: '#fff', fontSize: 44, fontWeight: 600, letterSpacing: -0.5,
        padding: '14px 34px', borderRadius: 16, maxWidth: 1500, textAlign: 'center'}}>{line.text}</div>
    </div>
  );
};
