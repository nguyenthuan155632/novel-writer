import { describe, it, expect } from 'vitest';
import { shouldRefreshRollingSummary } from '../../src/policy/summary-refresh.ts';

describe('shouldRefreshRollingSummary', () => {
  it('fires every N chapters relative to startChapter', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 105, startChapter: 101, endChapter: 130, everyN: 5 })).toBe(true);  // position 5
    expect(shouldRefreshRollingSummary({ chapterNumber: 104, startChapter: 101, endChapter: 130, everyN: 5 })).toBe(false); // position 4
  });
  it('always fires on the last chapter of the range', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 130, startChapter: 101, endChapter: 130, everyN: 7 })).toBe(true);
  });
  it('treats null startChapter as 1', () => {
    expect(shouldRefreshRollingSummary({ chapterNumber: 5, startChapter: null, endChapter: null, everyN: 5 })).toBe(true);
  });
});
