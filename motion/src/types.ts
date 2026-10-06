export type Mark = {text: string; color?: 'blue' | 'red' | 'yellow'};

export type ListItem = {t: number; text: string; sub?: string; badge?: string; tags?: string[]; accent?: boolean};

export type Scene = {start: number; end: number; chapter?: number} & (
  | {type: 'title'; kicker: string; title: string; sub?: string; subAt?: number}
  | {type: 'section'; index: string; title: string; sub?: string}
  | {type: 'list'; label?: string; heading: string; items: ListItem[]; columns?: 1 | 2}
  | {type: 'stat'; label?: string; value: string; unit?: string; caption: string; countFrom?: number}
  | {type: 'quote'; label?: string; lines: string[]; marks?: string[]; markAt?: number}
  | {type: 'footage'; label?: string; heading: string; from: number; notes: {t: number; text: string; color?: 'blue' | 'red'}[]}
  | {type: 'timeline'; label?: string; heading: string; total: number; days: {t: number; day: string; to: number; from?: number}[]; foot?: {t: number; text: string}}
  | {type: 'compare'; label?: string; heading: string; left: {title: string; items: string[]; t: number}; right: {title: string; items: string[]; t: number; good?: boolean}}
);

export type Word = {s: number; e: number; w: string};
export type Segment = {start: number; end: number; text: string; words: Word[]};
