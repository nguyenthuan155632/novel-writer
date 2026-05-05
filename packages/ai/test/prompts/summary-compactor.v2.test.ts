import { describe, it, expect } from 'vitest';
import { summaryCompactorPromptV2 } from '../../src/prompts/summary-compactor.v2.ts';

describe('summaryCompactorPromptV2', () => {
  it('adds monitor frame on system side', () => {
    const built = summaryCompactorPromptV2.build({
      chapterNumber: 1,
      chapterContent: 'Body',
      previousSummary: 'Prev',
      bibleCompact: 'Bible',
      genreFamily: 'cultivation',
    });

    expect(built.system).toContain('<monitor_frame>');
    expect(built.system).toContain('objective extraction');
    expect(built.system).toContain('importance classification');
  });
});
