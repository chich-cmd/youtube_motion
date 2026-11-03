export type Mark = {text: string; color?: 'blue' | 'red' | 'yellow'};

export type ListItem = {t: number; text: string; sub?: string; badge?: string; tags?: string[]; accent?: boolean;
  hl?: {t: number; until?: number; text: string}[]};  // marker sweeps over substrings of text / sub / tags

export type Scene = {start: number; end: number; chapter?: number} & (
  | {type: 'title'; kicker: string; title: string; sub?: string; subAt?: number}
  | {type: 'section'; index: string; title: string; sub?: string}
  | {type: 'list'; label?: string; heading: string; items: ListItem[]; columns?: 1 | 2}
  | {type: 'stat'; label?: string; value: string; unit?: string; caption: string; countFrom?: number}
  | {type: 'quote'; label?: string; lines: string[]; marks?: string[]; markAt?: number}
  | {type: 'footage'; label?: string; heading: string; from: number; notes: {t: number; text: string; color?: 'blue' | 'red'}[]}
  | {type: 'timeline'; label?: string; heading: string; total: number; days: {t: number; day: string; to: number; from?: number}[]; foot?: {t: number; text: string}}
  | {type: 'compare'; label?: string; heading: string; left: {title: string; items: string[]; t: number}; right: {title: string; items: string[]; t: number; good?: boolean}}
  | {type: 'ratio'; label?: string; heading: string; parts: {t: number; label: string; value: number; color?: string}[]; foot?: {t: number; text: string}}
  | {type: 'wordcard'; label?: string; heading: string; cards: WordCard[]; note?: {t: number; text: string}}
  | {type: 'clip'; label?: string; heading: string; items: ListItem[]; clip: {from: number; x: number; y?: number; w: number; h?: number; src?: string; shift?: {t: number; y: number; h: number}}}
  | {type: 'notice'; label?: string; badge?: string; lines: string[]; accentLine?: number}
  | {type: 'plan'; label?: string; heading: string; badge?: string; rows: {t: number; when: string; what: string; sub?: string; tag?: string; accent?: boolean}[]}
  | {type: 'passage'; label?: string; heading?: string; text: string; size?: number; marks: PassageMark[]; notes?: {t: number; text: string; color?: 'blue' | 'red'}[]}
);

export type WordCard = {t: number; en: string; ko: string; revealAt?: number; mark?: 'check' | 'q'; markAt?: number};

/** Annotation on the passage. Word indexes refer to text.split(' '). */
export type PassageMark = {t: number; until?: number} & (  // until: fade the mark out again
  | {kind: 'slash'; after: number; markAt?: number}                                // red "/" after word i
  | {kind: 'noslash'; after: number; markAt: number; quiet?: boolean}                // grey "/" after word i, crossed out at markAt
  | {kind: 'underline' | 'highlight' | 'circle' | 'strike'; from: number; to: number; color?: 'red' | 'blue' | 'yellow'}
  | {kind: 'label'; at: number; text: string; color?: 'red' | 'blue'}  // small tag above a word (S, V, 전치사…)
  | {kind: 'bracket'; from: number; to: number; text?: string}     // ( … ) around a clause, optional tag
);

export type Word = {s: number; e: number; w: string};
export type Segment = {start: number; end: number; text: string; words: Word[]};
