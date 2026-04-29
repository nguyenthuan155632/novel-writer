import { describe, it, expect } from 'vitest';
import { ArcPlannerOutputSchema } from '../../src/schemas/arc.ts';

describe('ArcPlannerOutputSchema', () => {
  it('accepts valid output', () => {
    const r = ArcPlannerOutputSchema.safeParse({
      arcs: Array.from({ length: 3 }, (_, i) => ({
        index: i, title: `Arc ${i}`, premise: 'p '.repeat(30).trim(),
        startChapter: i * 20 + 1, endChapter: (i + 1) * 20,
        expectedChanges: ['change one happens here'],
      })),
    });
    expect(r.success).toBe(true);
  });

  it('rejects only 1 arc', () => {
    const r = ArcPlannerOutputSchema.safeParse({
      arcs: [{ index: 0, title: 'a', premise: 'p '.repeat(30).trim(), startChapter: 1, endChapter: 20, expectedChanges: ['x change'] }],
    });
    expect(r.success).toBe(false);
  });
});