import { describe, it, expect } from 'vitest';
import { PERSONALITIES } from '../../src/catalog/personalities.ts';

describe('PERSONALITIES catalog', () => {
  it('has exactly 20 entries', () => {
    expect(PERSONALITIES).toHaveLength(20);
  });

  it('every slug is unique', () => {
    const slugs = PERSONALITIES.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has all required fields populated', () => {
    for (const p of PERSONALITIES) {
      expect(p.slug).toMatch(/^[a-z_]+$/);
      expect(p.viLabel.length).toBeGreaterThan(0);
      expect(p.viDescription.length).toBeGreaterThan(20);
      expect(p.voiceHints.length).toBeGreaterThan(20);
      expect(p.decisionStyle.length).toBeGreaterThan(20);
      expect(p.dialogueStyle.length).toBeGreaterThan(20);
      expect(p.conflictResponse.length).toBeGreaterThan(20);
      expect(Array.isArray(p.driftSignals)).toBe(true);
      expect(p.driftSignals.length).toBeGreaterThan(0);
    }
  });

  it('contains "tram_on" (default for legacy stories)', () => {
    expect(PERSONALITIES.find(p => p.slug === 'tram_on')).toBeDefined();
  });
});
