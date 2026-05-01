export type GenreFamily =
  | 'cultivation'
  | 'martial'
  | 'ability'
  | 'tech'
  | 'urban'
  | 'historical'
  | 'horror'
  | 'mystery'
  | 'system'
  | 'reincarnation'
  | 'mixed'
  | 'none';

export const GENRE_FAMILIES: readonly GenreFamily[] = [
  'cultivation', 'martial', 'ability', 'tech', 'urban',
  'historical', 'horror', 'mystery', 'system', 'reincarnation',
  'mixed', 'none',
] as const;
