import { describe, expect, it } from 'vitest';
import { computeHotHash, computeWarmHash } from '../../src/context/cache-keys.js';
import type { HotTier, WarmTier } from '../../src/context/types.js';

describe('computeHotHash', () => {
  it('returns a 64-char hex string', () => {
    const hot: HotTier = {
      systemRules: 'rules',
      bibleCompact: 'compact',
      styleGuide: 'guide',
      powerRules: 'power',
      styleFewShots: [],
    };
    const hash = computeHotHash(hot);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces same hash for identical inputs', () => {
    const hot: HotTier = {
      systemRules: 'rules',
      bibleCompact: 'compact',
      styleGuide: 'guide',
      powerRules: 'power',
      styleFewShots: [{ excerpt: 'test' }],
    };
    expect(computeHotHash(hot)).toBe(computeHotHash(hot));
  });

  it('produces different hash for different inputs', () => {
    const a: HotTier = { systemRules: 'a', bibleCompact: '', styleGuide: '', powerRules: '', styleFewShots: [] };
    const b: HotTier = { systemRules: 'b', bibleCompact: '', styleGuide: '', powerRules: '', styleFewShots: [] };
    expect(computeHotHash(a)).not.toBe(computeHotHash(b));
  });
});

describe('computeWarmHash', () => {
  const baseWarm: WarmTier = {
    sagaSummary: 'saga',
    arcSummary: 'arc',
    activeCharacters: [],
    arcOpenThreads: [],
    arcPlantedSeeds: [],
  };

  it('returns a 64-char hex string', () => {
    const hash = computeWarmHash(baseWarm);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces same hash for identical warm tiers', () => {
    expect(computeWarmHash(baseWarm)).toBe(computeWarmHash(baseWarm));
  });

  it('produces different hash when characters change', () => {
    const withChar: WarmTier = {
      ...baseWarm,
      activeCharacters: [{ id: 'c1', name: 'Linh', status: 'alive', bloodlines: [], shortTraits: [] }],
    };
    expect(computeWarmHash(baseWarm)).not.toBe(computeWarmHash(withChar));
  });
});
