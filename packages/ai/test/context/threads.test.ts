import { describe, it, expect } from 'vitest';
import { isThreadOverdue } from '../../src/context/threads.ts';
import type { ThreadCompact } from '../../src/context/types.ts';

const base: ThreadCompact = { id: 't1', title: 'Bí ẩn Hỏa Long', state: 'open', introducedChapter: 100 };

describe('isThreadOverdue', () => {
  it('uses plannedResolutionChapter when set', () => {
    expect(isThreadOverdue({ ...base, plannedResolutionChapter: 120 }, 121)).toBe(true);
    expect(isThreadOverdue({ ...base, plannedResolutionChapter: 120 }, 119)).toBe(false);
  });
  it('falls back to the introducedChapter heuristic when unplanned', () => {
    expect(isThreadOverdue(base, 111)).toBe(true);
    expect(isThreadOverdue(base, 110)).toBe(false);
  });
  it('resolved threads are never overdue', () => {
    expect(isThreadOverdue({ ...base, state: 'resolved', plannedResolutionChapter: 50 }, 200)).toBe(false);
  });
});
