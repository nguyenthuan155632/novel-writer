import { describe, it, expect } from 'vitest';
import { canonExtractorPromptV2 } from '../../src/prompts/canon-extractor.v2.ts';

describe('canonExtractorPromptV2', () => {
  it('adds monitor frame on system side', () => {
    const built = canonExtractorPromptV2.build({
      chapterNumber: 1,
      chapterContent: 'Body',
      bibleCompact: 'Bible',
      canonSnapshot: 'Snapshot',
      plantedSeeds: [],
      recentSummary: 'Prev',
    });

    expect(built.system).toContain('<monitor_frame>');
    expect(built.system).toContain('objective extraction');
    expect(built.system).toContain('importance classification');
  });

  it('requires character status updates for death or apparent-death events', () => {
    const built = canonExtractorPromptV2.build({
      chapterNumber: 65,
      chapterContent: 'Vân Yên ngừng thở.',
      bibleCompact: 'Bible',
      canonSnapshot: 'Snapshot',
      plantedSeeds: [],
      recentSummary: 'Prev',
    });

    expect(built.system).toContain("fields.status='dead'");
    expect(built.system).toContain("fields.status='missing'");
    expect(built.system).toContain("newTimelineEvents significance='pivotal'");
  });
});
