import { describe, it, expect } from 'vitest';
import { SagaPlannerOutputSchema } from '../../src/schemas/saga.ts';

describe('SagaPlannerOutputSchema', () => {
  it('rejects payload with too few sagas', () => {
    const r = SagaPlannerOutputSchema.safeParse({ sagas: [], plantedSeeds: [] });
    expect(r.success).toBe(false);
  });

  it('rejects seed where window end < start', () => {
    const r = SagaPlannerOutputSchema.safeParse({
      sagas: Array.from({ length: 5 }, (_, i) => ({
        index: i,
        title: `S${i}`,
        premise: 'x'.repeat(50),
        startChapter: i * 100 + 1,
        endChapter: (i + 1) * 100,
        expectedTurningPoints: ['a turning point event', 'another turning point event'],
      })),
      plantedSeeds: Array.from({ length: 10 }, (_, i) => ({
        seedKey: `seed_${i}`,
        description: 'x'.repeat(40),
        plantWindowStart: 50,
        plantWindowEnd: 30,
        payoffChapter: 200,
        importance: 'minor' as const,
      })),
    });
    expect(r.success).toBe(false);
  });

  it('accepts valid saga planner output', () => {
    const r = SagaPlannerOutputSchema.safeParse({
      sagas: Array.from({ length: 5 }, (_, i) => ({
        index: i,
        title: `Saga ${i}`,
        premise: 'A premise '.repeat(8),
        startChapter: i * 100 + 1,
        endChapter: (i + 1) * 100,
        expectedTurningPoints: ['first turning point event', 'second turning point event'],
      })),
      plantedSeeds: Array.from({ length: 10 }, (_, i) => ({
        seedKey: `k_${i}`,
        description: 'desc '.repeat(10),
        plantWindowStart: 1,
        plantWindowEnd: 50,
        payoffChapter: 100,
        importance: 'minor' as const,
      })),
    });
    expect(r.success).toBe(true);
  });
});