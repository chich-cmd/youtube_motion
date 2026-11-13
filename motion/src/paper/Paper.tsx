import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {FONT, FPS} from '../theme';

/**
 * Vertical paper close-up in the style of hand-written study reels: a fixed two-part title on top
 * (keyword on a red block), and outlined captions with coloured keywords that pop in.
 * Caption markup: [word] = yellow, {word} = red, <word> = sky blue, (( word )) = green.
 */
export type PaperLine = {s: number; e: number; text: string};
export type PaperProps = {video: string; lines: PaperLine[]; title?: [string, string]};

const COLORS: Record<string, string> = {'[': '#FFE14D', '{': '#FF4B4B', '<': '#5EC8FF', '(': '#6BF07A'};
// Title: crisp dark outline + glow. Captions: soft dark glow only (as in the reference reel).
const OUTLINE = '3px 3px 0 #111, -3px 3px 0 #111, 3px -3px 0 #111, -3px -3px 0 #111, 0 3px 0 #111, 0 -3px 0 #111, 3px 0 0 #111, -3px 0 0 #111, 0 0 18px rgba(0,0,0,0.75)';
// Solid black outline (8 directions, two widths) + a soft shadow so captions read on white paper.
const GLOW = [4, 2].flatMap((r) => [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]].map(([x, y]) => `${x}px ${y}px 0 #000`))
  .concat('0 6px 14px rgba(0,0,0,0.6)').join(', ');

const Word: React.FC<{text: string; color?: string; f0: number}> = ({text, color}) => (
  // Emphasis is static: colour + a larger size, no motion.
  <span style={{color: color ?? '#fff', fontSize: color ? '1.16em' : '1em', fontWeight: 900,
    WebkitTextStroke: '14px #000', paintOrder: 'stroke fill'}}>{text}</span>   // thick outline drawn under the fill
);

const tokens = (text: string) => text.split(/(\[[^\]]+\]|\{[^}]+\}|<[^>]+>|\(\([^)]+\)\))/).filter(Boolean).map((p) => {
  const c = COLORS[p[0]];
  if (c && p.startsWith('((')) return {t: p.slice(2, -2), c};
  if (c && p[0] !== '(') return {t: p.slice(1, -1), c};
  return {t: p, c: undefined};
});

/** Words (split on spaces) as groups of coloured/plain runs, so a keyword and its particle never wrap apart. */
const groups = (text: string) => {
  const out: {t: string; c?: string}[][] = [[]];
  for (const tok of tokens(text)) {
    (tok.c ? [tok.t.replace(/ /g, '\u00a0')] : tok.t.split(/( )/)).forEach((piece) => {   // a coloured phrase stays on one line
      if (piece === ' ') { if (out[out.length - 1].length) out.push([]); }
      else if (piece) out[out.length - 1].push({t: piece, c: tok.c});
    });
  }
  return out.filter((g) => g.length);
};

export const Paper: React.FC<PaperProps> = ({video, lines, title}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = lines.find((l) => t >= l.s && t < l.e);
  const f0 = line ? Math.round(line.s * FPS) : 0;
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: `${FONT}, 'Noto Color Emoji'`, wordBreak: 'keep-all'}}>
      <OffthreadVideo src={staticFile(video)} />
      {title ? (
        <div style={{position: 'absolute', left: 20, right: 20, top: 300, textAlign: 'center', fontSize: 78, fontWeight: 900,
          letterSpacing: -2.5, lineHeight: 1.2, textShadow: OUTLINE}}>
          <span style={{color: '#FF2A23'}}>{title[0]}</span>
          <span style={{color: '#fff', marginLeft: 16}}>{title[1]}</span>
        </div>
      ) : null}
      {line ? (
        <div style={{position: 'absolute', left: 40, right: 40, top: 1230, textAlign: 'center', fontSize: 96, fontWeight: 900,
          letterSpacing: -2, lineHeight: 1.28, textShadow: '0 8px 18px rgba(0,0,0,0.55)'}}>
          {line.text.split('\n').map((row, ri) => (     // '\n' = forced line break
            <div key={ri}>
              {groups(row).map((g, gi) => (
                <span key={gi} style={{display: 'inline-block', whiteSpace: 'nowrap', margin: '0 0.14em'}}>
                  {g.map((w, i) => <Word key={i} text={w.t} color={w.c} f0={f0} />)}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
