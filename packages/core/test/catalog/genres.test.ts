import { describe, it, expect } from 'vitest';
import { GENRES, type GenreSlug } from '../../src/catalog/genres.ts';
import { GENRE_FAMILIES } from '../../src/catalog/genre-families.ts';

describe('GENRES catalog', () => {
  it('has exactly 25 entries (24 user-facing + tuy_chon sentinel)', () => {
    expect(GENRES).toHaveLength(25);
  });

  it('every slug is unique', () => {
    const slugs = GENRES.map(g => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has all required fields populated', () => {
    for (const g of GENRES) {
      expect(g.slug).toMatch(/^[a-z_]+$/);
      expect(g.viLabel.length).toBeGreaterThan(0);
      expect(g.viDescription.length).toBeGreaterThan(20);
      expect(GENRE_FAMILIES).toContain(g.family);
      expect(Array.isArray(g.allowedTropes)).toBe(true);
      expect(Array.isArray(g.discouragedTropes)).toBe(true);
      expect(g.toneGuidance.length).toBeGreaterThan(20);
      expect(g.worldbuildingGuidance.length).toBeGreaterThan(20);
      expect(Array.isArray(g.examplePremises)).toBe(true);
    }
  });

  it('contains the sentinel "tuy_chon"', () => {
    const tc = GENRES.find(g => g.slug === 'tuy_chon');
    expect(tc).toBeDefined();
    expect(tc?.family).toBe('none');
  });

  it('contains "tien_hiep" (legacy default) with family=cultivation', () => {
    const t = GENRES.find(g => g.slug === 'tien_hiep');
    expect(t).toBeDefined();
    expect(t?.family).toBe('cultivation');
  });

  it('every GenreFamily value is represented by at least one genre except "none" which only "tuy_chon" uses', () => {
    const families = new Set(GENRES.map(g => g.family));
    expect(families.has('cultivation')).toBe(true);
    expect(families.has('martial')).toBe(true);
    expect(families.has('ability')).toBe(true);
    expect(families.has('tech')).toBe(true);
    expect(families.has('urban')).toBe(true);
    expect(families.has('historical')).toBe(true);
    expect(families.has('horror')).toBe(true);
    expect(families.has('mystery')).toBe(true);
    expect(families.has('system')).toBe(true);
    expect(families.has('reincarnation')).toBe(true);
    expect(families.has('mixed')).toBe(true);
    expect(families.has('none')).toBe(true);
  });
});
