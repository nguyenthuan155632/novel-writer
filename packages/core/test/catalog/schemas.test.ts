import { describe, it, expect } from 'vitest';
import {
  GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema,
  findGenre, findPersonality,
} from '../../src/catalog/schemas.ts';

describe('GenreSlugSchema', () => {
  it('accepts a valid catalog slug', () => {
    expect(GenreSlugSchema.parse('tien_hiep')).toBe('tien_hiep');
    expect(GenreSlugSchema.parse('do_thi')).toBe('do_thi');
    expect(GenreSlugSchema.parse('tuy_chon')).toBe('tuy_chon');
  });

  it('rejects an unknown slug', () => {
    expect(() => GenreSlugSchema.parse('xianxia_fantasy')).toThrow();
    expect(() => GenreSlugSchema.parse('')).toThrow();
  });
});

describe('PersonalitySlugSchema', () => {
  it('accepts a valid catalog slug', () => {
    expect(PersonalitySlugSchema.parse('calm_rational')).toBe('calm_rational');
    expect(PersonalitySlugSchema.parse('tram_on')).toBe('tram_on');
  });

  it('rejects an unknown slug', () => {
    expect(() => PersonalitySlugSchema.parse('hero')).toThrow();
  });
});

describe('StoryOptionsSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(StoryOptionsSchema.parse({})).toEqual({});
  });

  it('accepts a partial object', () => {
    const parsed = StoryOptionsSchema.parse({ tone: 'serious', pov: 'first' });
    expect(parsed.tone).toBe('serious');
    expect(parsed.pov).toBe('first');
  });

  it('rejects unknown slug values', () => {
    expect(() => StoryOptionsSchema.parse({ tone: 'epic' })).toThrow();
  });
});

describe('findGenre / findPersonality', () => {
  it('findGenre returns the def for a known slug', () => {
    expect(findGenre('tien_hiep').viLabel).toBe('Tiên hiệp');
  });

  it('findGenre throws for unknown', () => {
    expect(() => findGenre('xianxia_fantasy')).toThrow(/Unknown genre/);
  });

  it('findPersonality returns the def for a known slug', () => {
    expect(findPersonality('tram_on').viLabel).toBe('Trầm ổn, có trách nhiệm');
  });
});
