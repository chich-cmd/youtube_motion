import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Black line-art student at a desk, drawn in SVG and animated per mood.
 * A turbulence displacement that re-seeds every few frames gives the hand-drawn "line boil".
 */
export type Mood = 'think' | 'look' | 'excited' | 'study' | 'sweat' | 'dizzy' | 'cry' | 'win';

const S = {fill: 'none', stroke: '#111', strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};

export const Doodle: React.FC<{mood: Mood; size: number}> = ({mood, size}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const seed = Math.floor(f / 4);
  const id = `boil${seed % 1000}`;
  const writing = mood === 'study' || mood === 'sweat';
  const pen = writing ? Math.sin(t * Math.PI * 4) * 14 : 0;                 // pencil scribbles back and forth
  const headTilt = mood === 'think' ? -8 + Math.sin(t * 2) * 3 : mood === 'dizzy' ? Math.sin(t * 7) * 10 : Math.sin(t * 2.4) * 3;
  const bounce = mood === 'excited' || mood === 'win' ? -Math.abs(Math.sin(t * Math.PI * 2.2)) * 18 : 0;

  // eyes / mouth per mood (head centre 200,120 in a 400x360 box)
  const eyes = (() => {
    switch (mood) {
      case 'look': {
        const dx = Math.sin(t * 3) * 6;
        return (<>
          <circle cx={172} cy={112} r={17} {...S} /><circle cx={228} cy={112} r={17} {...S} />
          <circle cx={172 + dx} cy={106} r={7} fill="#111" /><circle cx={228 + dx} cy={106} r={7} fill="#111" />
        </>);
      }
      case 'win':
      case 'excited': {
        const star = (cx: number) => <path d={`M${cx} ${98} l5 12 13 1 -10 8 4 13 -12 -7 -12 7 4 -13 -10 -8 13 -1z`} {...S} strokeWidth={4} />;
        return <>{star(172)}{star(228)}</>;
      }
      case 'dizzy': {
        const sp = (cx: number) => <path d={`M${cx} 112 m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -10 0 a9 9 0 1 1 18 0 a13 13 0 1 1 -26 0`} {...S} strokeWidth={4} transform={`rotate(${t * 360} ${cx} 112)`} />;
        return <>{sp(172)}{sp(228)}</>;
      }
      case 'cry':
        return (<>
          <path d="M160 108 q12 8 24 0" {...S} /><path d="M216 108 q12 8 24 0" {...S} />
          <path d={`M168 118 q-4 ${18 + (f % 12)} 2 ${30 + (f % 12)}`} {...S} strokeWidth={4} />
          <path d={`M232 118 q4 ${18 + ((f + 6) % 12)} -2 ${30 + ((f + 6) % 12)}`} {...S} strokeWidth={4} />
        </>);
      case 'study':
        return (<>
          <circle cx={172} cy={112} r={20} {...S} strokeWidth={5} /><circle cx={228} cy={112} r={20} {...S} strokeWidth={5} />
          <path d="M192 112 h16" {...S} strokeWidth={5} />
          <circle cx={174} cy={118} r={5} fill="#111" /><circle cx={230} cy={118} r={5} fill="#111" />
        </>);
      default: {
        const blink = Math.floor(t * 10) % 32 === 0;
        return blink ? (<><path d="M164 112 h16" {...S} /><path d="M220 112 h16" {...S} /></>)
          : (<><circle cx={172} cy={112} r={7} fill="#111" /><circle cx={228} cy={112} r={7} fill="#111" /></>);
      }
    }
  })();
  const mouth = {
    think: <path d="M188 150 q12 -6 24 2" {...S} />,
    look: <ellipse cx={200} cy={152} rx={8} ry={10} {...S} />,
    excited: <path d="M176 142 q24 34 48 0 z" {...S} />,
    win: <path d="M172 140 q28 40 56 0 z" {...S} />,
    study: <path d="M190 154 q10 6 20 0" {...S} />,
    sweat: <path d="M180 150 q20 14 40 0 M184 152 h32" {...S} />,
    dizzy: <path d="M182 154 q6 -8 12 0 q6 8 12 0 q6 -8 12 0" {...S} />,
    cry: <path d="M182 160 q18 -26 36 0 z" {...S} />,
  }[mood];
  const brows = mood === 'think' ? <path d="M160 86 q12 -10 24 -2 M218 90 h22" {...S} strokeWidth={5} />
    : mood === 'sweat' || mood === 'cry' ? <path d="M160 88 l22 6 M240 88 l-22 6" {...S} strokeWidth={5} /> : null;

  // arms: left hand on chin (think), both up (excited), right hand writing otherwise
  const wave = Math.sin(t * Math.PI * 3) * 10;
  const arms = mood === 'win'
    ? <><path d={`M150 228 q-44 -36 ${-58 + wave} -100`} {...S} /><path d="M250 228 q44 -30 92 -86" {...S} /></>
    : mood === 'think'
    ? <><path d="M150 230 q-30 -10 -8 -56 q10 -18 30 -16" {...S} /><path d="M250 230 q40 40 60 74" {...S} /></>
    : mood === 'excited'
      ? <><path d="M150 228 q-40 -40 -50 -96" {...S} /><path d="M250 228 q40 -40 50 -96" {...S} /></>
      : mood === 'cry' || mood === 'dizzy'
        ? <><path d="M150 230 q-30 30 -40 74" {...S} /><path d="M250 230 q30 30 40 74" {...S} /></>
        : <><path d="M150 230 q-30 30 -36 74" {...S} /><path d={`M250 230 q40 26 ${44 + pen} 70`} {...S} />
            <path d={`M${294 + pen} 300 l18 -40`} {...S} strokeWidth={8} /><path d={`M${312 + pen} 260 l4 -8`} {...S} strokeWidth={4} /></>;

  const extras = (() => {
    switch (mood) {
      case 'think': return <text x={300} y={70 + Math.sin(t * 3) * 6} fontSize={64} fontWeight={900} fill="#111" fontFamily="sans-serif">?</text>;
      case 'excited': return <>{[0, 1, 2].map((i) => {
        const a = t * 2 + i * 2.1, r = 150, x = 200 + Math.cos(a) * r, y = 120 + Math.sin(a) * 70;
        return <path key={i} d={`M${x} ${y - 14} l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z`} {...S} strokeWidth={4} />;
      })}</>;
      case 'sweat': return <path d={`M262 ${80 + (f % 20)} q10 16 0 22 q-10 -6 0 -22z`} {...S} strokeWidth={4} />;
      case 'dizzy': return <path d={`M150 34 q50 -26 100 0`} {...S} strokeWidth={4} strokeDasharray="10 12" strokeDashoffset={-f * 3} />;
      case 'win': {
        const sw = Math.sin(t * Math.PI * 2) * 6;
        return (<g>
          {/* 100-point test paper held up in the right hand */}
          <g transform={`translate(44 -10) rotate(${8 + sw} 318 120)`}>
            <rect x={262} y={20} width={120} height={150} rx={6} {...S} fill="#fff" strokeWidth={6} />
            {[0, 1, 2, 3].map((i) => <path key={i} d={`M278 ${108 + i * 14} h${88 - i * 12}`} {...S} strokeWidth={3} />)}
            <ellipse cx={322} cy={62} rx={44} ry={30} fill="none" stroke="#E0322B" strokeWidth={6} />
            <text x={322} y={78} textAnchor="middle" fontSize={44} fontWeight={900} fill="#E0322B" fontFamily="sans-serif">100</text>
          </g>
          {[0, 1, 2].map((i) => {
            const a = t * 2.4 + i * 2.1, x = 200 + Math.cos(a) * 170, y = 110 + Math.sin(a) * 80;
            return <path key={i} d={`M${x} ${y - 14} l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z`} {...S} strokeWidth={4} />;
          })}
        </g>);
      }
      case 'cry': return <><path d="M60 330 l24 -24 M60 306 l24 24" {...S} strokeWidth={5} /><path d="M330 330 l24 -24 M330 306 l24 24" {...S} strokeWidth={5} /></>;
      default: return null;
    }
  })();

  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 400 360" style={{overflow: 'visible'}}>
      <defs>
        <filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={4} /></filter>
      </defs>
      <g filter={`url(#${id})`} transform={`translate(0 ${bounce})`}>
        {/* desk + paper */}
        <path d="M30 304 h340" {...S} />
        <path d="M200 304 l14 -26 h110 l-6 26" {...S} strokeWidth={5} />
        {[0, 1, 2].map((i) => <path key={i} d={`M${226 + i * 3} ${296 - i * 7} h${60 - i * 6}`} {...S} strokeWidth={3} />)}
        {/* body */}
        <path d="M140 304 q-6 -86 60 -96 q66 10 60 96" {...S} />
        {arms}
        {/* head */}
        <g transform={`rotate(${headTilt} 200 200)`}>
          <circle cx={200} cy={120} r={84} {...S} />
          <path d="M126 92 q30 -60 92 -50 q46 8 62 50" {...S} strokeWidth={5} />
          {eyes}{brows}{mouth}
          {mood === 'win' ? (<g>
            <path d="M118 84 q82 -30 164 0 l-4 26 q-78 -28 -156 0 z" {...S} fill="#fff" strokeWidth={5} />
            <text x={200} y={86} textAnchor="middle" fontSize={31} fontWeight={900} fill="#E0322B" fontFamily="Pretendard, sans-serif">수능대박</text>
            <path d="M282 92 l26 -8 l-6 22 z M282 92 l24 18" {...S} strokeWidth={4} />
          </g>) : null}
        </g>
        {extras}
      </g>
    </svg>
  );
};
