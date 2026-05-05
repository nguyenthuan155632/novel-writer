import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetStaleGeneratingChapters = vi.fn();

vi.mock('../../src/services/stale-job-detector.js', () => ({
  resetStaleGeneratingChapters,
}));

describe('runPostFlightAudit', () => {
  beforeEach(() => {
    resetStaleGeneratingChapters.mockReset();
  });

  it('returns audit summary and warns for missing embeddings', async () => {
    resetStaleGeneratingChapters.mockResolvedValue(2);
    const execute = vi
      .fn()
      .mockResolvedValueOnce([{ chapter_id: 'chapter-1' }, { chapter_id: 'chapter-2' }])
      .mockResolvedValueOnce([{ count: 10 }]);
    const logger = { info: vi.fn(), warn: vi.fn() };
    const db = { execute };

    const { runPostFlightAudit } = await import('../../src/services/post-flight-audit.js');
    const result = await runPostFlightAudit({ db: db as any, logger: logger as any });

    expect(result).toEqual({
      missingEmbeddingChapterIds: ['chapter-1', 'chapter-2'],
      staleResetCount: 2,
      pendingReviewCount: 10,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ count: 2, chapterIds: ['chapter-1', 'chapter-2'] }),
      'post-flight audit found chapter summaries missing embeddings',
    );
  });

  it('warns when aged pending canon updates exceed threshold', async () => {
    resetStaleGeneratingChapters.mockResolvedValue(0);
    const execute = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 51 }]);
    const logger = { info: vi.fn(), warn: vi.fn() };
    const db = { execute };

    const { runPostFlightAudit } = await import('../../src/services/post-flight-audit.js');
    await runPostFlightAudit({ db: db as any, logger: logger as any });

    expect(logger.warn).toHaveBeenCalledWith(
      { pendingReviewCount: 51, threshold: 50 },
      'post-flight audit found too many aged pending canon updates',
    );
  });
});
