import { describe, it, expect } from 'vitest';
import { mergeRecalledCharacters } from '../../src/context/builder.ts';
import type { CharacterCompact } from '../../src/context/types.ts';

const active: CharacterCompact[] = [
  { id: 'a', name: 'Lam Trạch', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 299 },
];
const dormant: CharacterCompact[] = [
  { id: 'b', name: 'Hàn Lập', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 250 },
  { id: 'a', name: 'Lam Trạch', status: 'alive', bloodlines: [], shortTraits: [], lastActiveChapter: 299 },
];

describe('mergeRecalledCharacters', () => {
  it('appends dormant characters, dedupes by id, stamps lastActiveChapter', () => {
    const merged = mergeRecalledCharacters(active, dormant, 300);
    expect(merged).toHaveLength(2);
    const han = merged.find((c) => c.id === 'b')!;
    expect(han.lastActiveChapter).toBe(300);
    // already-active entry is untouched
    expect(merged.find((c) => c.id === 'a')!.lastActiveChapter).toBe(299);
  });
});
