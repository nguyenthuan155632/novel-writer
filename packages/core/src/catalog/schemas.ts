import { z } from 'zod';
import { GENRES, type GenreDef, type GenreSlug } from './genres.ts';
import { PERSONALITIES, type PersonalityDef, type PersonalitySlug } from './personalities.ts';
import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
} from './story-options.ts';

function slugsOf<T extends { slug: string }>(arr: readonly T[]): [string, ...string[]] {
  const slugs = arr.map(x => x.slug);
  if (slugs.length === 0) throw new Error('catalog list cannot be empty');
  return slugs as [string, ...string[]];
}

export const GenreSlugSchema = z.enum(slugsOf(GENRES));
export const PersonalitySlugSchema = z.enum(slugsOf(PERSONALITIES));

export const StoryOptionsSchema = z.object({
  tone:                z.enum(slugsOf(TONES)).optional(),
  pacing:              z.enum(slugsOf(PACINGS)).optional(),
  mainConflictType:    z.enum(slugsOf(MAIN_CONFLICT_TYPES)).optional(),
  powerSystemStyle:    z.enum(slugsOf(POWER_SYSTEM_STYLES)).optional(),
  worldEra:            z.enum(slugsOf(WORLD_ERAS)).optional(),
  romanceLevel:        z.enum(slugsOf(ROMANCE_LEVELS)).optional(),
  comedyLevel:         z.enum(slugsOf(COMEDY_LEVELS)).optional(),
  darkLevel:           z.enum(slugsOf(DARK_LEVELS)).optional(),
  pov:                 z.enum(slugsOf(POVS)).optional(),
  protagonistMorality: z.enum(slugsOf(MORALITIES)).optional(),
});

export type StoryOptions = z.infer<typeof StoryOptionsSchema>;

export function findGenre(slug: string): GenreDef {
  const g = GENRES.find(x => x.slug === slug);
  if (!g) throw new Error(`Unknown genre: ${slug}`);
  return g;
}

export function findPersonality(slug: string): PersonalityDef {
  const p = PERSONALITIES.find(x => x.slug === slug);
  if (!p) throw new Error(`Unknown personality: ${slug}`);
  return p;
}
