import { describe, expect, it, vi } from 'vitest';

const mockRunGenerateChapterJob = vi.fn();
const mockBatchRow = {
  id: 'batch-1',
  status: 'running',
};
const updates: unknown[] = [];

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockBatchRow],
        }),
      }),
    }),
    update: () => ({
      set: (value: unknown) => ({
        where: async () => {
          updates.push(value);
        },
      }),
    }),
  }),
}));

vi.mock('@novel/db/schema', () => ({
  batches: {},
}));

vi.mock('../../src/jobs/generate-chapter.js', () => ({
  runGenerateChapterJob: (...args: unknown[]) => mockRunGenerateChapterJob(...args),
}));

describe('runGenerateBatchJob', () => {
  it('generates each chapter and updates batch progress instead of marking it completed immediately', async () => {
    updates.length = 0;
    mockRunGenerateChapterJob.mockReset();
    mockRunGenerateChapterJob.mockResolvedValue({
      status: 'completed',
      totalCostUsd: 0.01,
    });

    const { runGenerateBatchJob } = await import('../../src/jobs/generate-batch.js');
    const logger = { child: () => logger, info: () => {}, warn: () => {}, error: () => {} };
    const result = await runGenerateBatchJob({
      batchId: 'batch-1',
      storyId: 'story-1',
      startChapter: 3,
      endChapter: 5,
      mode: 'semi_auto',
      traceId: 'trace-1',
      llmProvider: 'openrouter',
      modelRoutes: { writer: 'google/gemini-2.5-flash' },
    }, { logger });

    expect(mockRunGenerateChapterJob).toHaveBeenCalledTimes(3);
    expect(mockRunGenerateChapterJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        storyId: 'story-1',
        chapterNumber: 3,
        mode: 'semi_auto',
        llmProvider: 'openrouter',
        modelRoutes: { writer: 'google/gemini-2.5-flash' },
      }),
      expect.anything(),
    );
    expect(result).toEqual({ status: 'completed', completed: 3 });
    expect(updates).toContainEqual(expect.objectContaining({ completedChapters: 1 }));
    expect(updates).toContainEqual(expect.objectContaining({ completedChapters: 2 }));
    expect(updates).toContainEqual(expect.objectContaining({ completedChapters: 3, status: 'completed' }));
  });
});
