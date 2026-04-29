import { describe, it, expect } from 'vitest';
import { shouldRunReviewer } from '../../src/policy/high-stakes-triggers.ts';

describe('shouldRunReviewer', () => {
  it('runs on critical severity regardless of position', () => {
    const r = shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'critical' });
    expect(r.run).toBe(true);
    expect(r.reason).toBe('critical_severity');
  });
  it('runs at arc end when feature enabled', () => {
    const r = shouldRunReviewer({ chapterNumber: 20, arcEndChapter: 20, worstValidatorSeverity: 'low' });
    expect(r.run).toBe(true);
    expect(r.reason).toBe('arc_end');
  });
  it('skips otherwise', () => {
    expect(shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'low' }).run).toBe(false);
  });
});