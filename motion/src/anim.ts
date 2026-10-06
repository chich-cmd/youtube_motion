import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './theme';

export const sec = (s: number) => Math.round(s * FPS);

/** 0→1 entrance progress for an element appearing at local frame `at`. */
export const enter = (frame: number, at: number, dur = 18) =>
  interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

export const pop = (frame: number, at: number) =>
  spring({frame: frame - at, fps: FPS, config: {damping: 16, stiffness: 140, mass: 0.7}});

/** Fade-out over the last `dur` frames of a scene of length `len`. */
export const exit = (frame: number, len: number, dur = 10) =>
  interpolate(frame, [len - dur, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const rise = (p: number, px = 40) => ({
  opacity: p,
  transform: `translateY(${(1 - p) * px}px)`,
});
