import { describe, it, expect } from 'vitest';
import { computeTurningPointStatuses } from '../../src/context/turning-points.ts';

const tps = ['Gặp sư phụ', 'Đột phá Trúc Cơ', 'Diệt Huyết Ma Tông', 'Rời Đông Vực'];

describe('computeTurningPointStatuses', () => {
  it('completed TPs are done even past their milestone; incomplete past-milestone TPs are overdue', () => {
    // position 30/40 → uniform milestone index = floor(29 / 10) = 2 (third TP window)
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0], sagaPosition: 30, sagaSpan: 40,
    });
    expect(statuses.map((s) => s.state)).toEqual(['done', 'overdue', 'current', 'upcoming']);
  });
  it('a TP completed ahead of schedule is done, and current advances to the first incomplete TP', () => {
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0, 1, 2], sagaPosition: 5, sagaSpan: 40,
    });
    expect(statuses.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current']);
  });
  it('all complete → all done', () => {
    const statuses = computeTurningPointStatuses({
      turningPoints: tps, completedIndices: [0, 1, 2, 3], sagaPosition: 40, sagaSpan: 40,
    });
    expect(statuses.every((s) => s.state === 'done')).toBe(true);
  });
});
