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
        parallelThreads: [],
        convergencePoints: [],
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
        parallelThreads: [],
        convergencePoints: [],
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

  it('accepts parallel threads and convergence points', () => {
    const r = SagaPlannerOutputSchema.safeParse({
      sagas: [{
        index: 0,
        title: 'Saga 0',
        premise: 'A premise '.repeat(8),
        startChapter: 1,
        endChapter: 100,
        expectedTurningPoints: ['first turning point event', 'second turning point event'],
        parallelThreads: [
          { id: 'thread-a', premise: 'Side plot across border sect war', startChapter: 10, endChapter: 30, parentTimelineId: null },
        ],
        convergencePoints: [
          { atChapter: 30, threadIds: ['thread-a'], synopsis: 'Threads reunite at mountain summit.' },
        ],
      }],
      plantedSeeds: [{
        seedKey: 'k_1',
        description: 'desc '.repeat(10),
        plantWindowStart: 1,
        plantWindowEnd: 50,
        payoffChapter: 100,
        importance: 'minor' as const,
      }],
    });
    expect(r.success).toBe(true);
  });
});
