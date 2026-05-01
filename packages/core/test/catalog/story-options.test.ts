import { describe, it, expect } from 'vitest';
import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
} from '../../src/catalog/story-options.ts';

describe('story-options enums', () => {
  const enums = {
    TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
    ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  };

  it.each(Object.entries(enums))('%s has unique slugs and non-empty viLabels', (_name, list) => {
    const slugs = list.map(x => x.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of list) {
      expect(item.slug).toMatch(/^[a-z_]+$/);
      expect(item.viLabel.length).toBeGreaterThan(0);
    }
  });

  it('expected counts per spec section 6.4', () => {
    expect(TONES).toHaveLength(5);
    expect(PACINGS).toHaveLength(4);
    expect(MAIN_CONFLICT_TYPES).toHaveLength(5);
    expect(POWER_SYSTEM_STYLES).toHaveLength(6);
    expect(WORLD_ERAS).toHaveLength(5);
    expect(ROMANCE_LEVELS).toHaveLength(4);
    expect(COMEDY_LEVELS).toHaveLength(4);
    expect(DARK_LEVELS).toHaveLength(4);
    expect(POVS).toHaveLength(3);
    expect(MORALITIES).toHaveLength(4);
  });
});
