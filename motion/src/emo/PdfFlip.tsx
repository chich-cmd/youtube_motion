import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * A stack of PDF pages; the top page turns sideways (around its left edge, like a booklet) every `every` seconds.
 * `first` is the page index to start from, so consecutive clips keep flipping through the same booklet.
 */
export const PdfFlip: React.FC<{pages: string[]; width: number; first: number; every: number}> = ({pages, width, first, every}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const H = (width * 1287) / 909;
  const per = Math.round(every * fps), turn = Math.round(0.55 * fps);
  const n = Math.floor(f / per), local = f - n * per;
  const cur = (first + n) % pages.length, next = (cur + 1) % pages.length;
  const p = interpolate(local, [per - turn, per], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const page = (src: string, extra: React.CSSProperties = {}) => (
    <Img src={staticFile(`pdfpages/${src}`)} style={{position: 'absolute', inset: 0, width, height: H, borderRadius: 6,
      boxShadow: '0 1px 0 #ccc', background: '#fff', ...extra}} />
  );
  return (
    <div style={{position: 'relative', width, height: H, perspective: 2200}}>
      {/* stack edges */}
      {[3, 2, 1].map((k) => (
        <div key={k} style={{position: 'absolute', left: k * 5, top: k * 5, width, height: H, background: '#fff', borderRadius: 6,
          border: '2px solid #222', boxShadow: k === 3 ? '0 18px 40px rgba(0,0,0,0.18)' : undefined}} />
      ))}
      <div style={{position: 'absolute', inset: 0, border: '2px solid #222', borderRadius: 6, overflow: 'hidden', width, height: H}}>
        {page(pages[next])}
      </div>
      {/* the turning page */}
      <div style={{position: 'absolute', inset: 0, width, height: H, transformOrigin: 'left center', transformStyle: 'preserve-3d',
        transform: `rotateY(${-170 * ease}deg)`, border: '2px solid #222', borderRadius: 6, overflow: 'hidden', background: '#f4f4f4',
        opacity: p >= 0.98 ? 0 : 1}}>
        {page(pages[cur])}
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.35 * Math.sin(ease * Math.PI)}))`}} />
      </div>
    </div>
  );
};
