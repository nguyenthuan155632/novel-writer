import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn();
const mockGetJob = vi.fn();
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    getJob: mockGetJob,
  })),
}));
vi.mock('ioredis', () => ({ default: vi.fn() }));

import {
  enqueueGenerateChapter,
  enqueueGenerateExport,
  enqueueHighStakesReview,
} from '../../src/services/queue-client.js';

describe('enqueueGenerateChapter', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: 'gen-s1-1' });
    mockGetJob.mockReset();
    mockGetJob.mockResolvedValue(null);
  });

  it('uses deterministic jobId for idempotency', async () => {
    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe', traceId: 'trace-1' });
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1, traceId: 'trace-1' }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });

  it('removes a failed existing job before re-enqueueing the same chapter', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    mockGetJob.mockResolvedValueOnce({
      getState: vi.fn().mockResolvedValue('failed'),
      remove,
    });

    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe', traceId: 'trace-1' });

    expect(remove).toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1, traceId: 'trace-1' }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });

  it('enqueues manual high-stakes review jobs deterministically', async () => {
    mockAdd.mockResolvedValueOnce({ id: 'review-c1-manual' });

    const jobId = await enqueueHighStakesReview({
      storyId: 's1',
      chapterId: 'c1',
      chapterNumber: 7,
      triggerReason: 'manual',
      traceId: 'trace-1',
    });

    expect(jobId).toBe('review-c1-manual');
    expect(mockAdd).toHaveBeenCalledWith(
      'high-stakes-review',
      expect.objectContaining({
        storyId: 's1',
        chapterId: 'c1',
        chapterNumber: 7,
        triggerReason: 'manual',
        traceId: 'trace-1',
      }),
      expect.objectContaining({ jobId: 'review-c1-manual' }),
    );
  });

  it('enqueues export jobs with format-specific deterministic ids', async () => {
    mockAdd.mockResolvedValueOnce({ id: 'export-s1-epub' });

    const jobId = await enqueueGenerateExport({ storyId: 's1', format: 'epub' });

    expect(jobId).toBe('export-s1-epub');
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-export',
      { storyId: 's1', format: 'epub' },
      expect.objectContaining({ jobId: 'export-s1-epub' }),
    );
  });
});
