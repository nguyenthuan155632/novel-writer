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

import { enqueueGenerateChapter } from '../../src/services/queue-client.js';

describe('enqueueGenerateChapter', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: 'gen-s1-1' });
    mockGetJob.mockReset();
    mockGetJob.mockResolvedValue(null);
  });

  it('uses deterministic jobId for idempotency', async () => {
    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe' });
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1 }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });

  it('removes a failed existing job before re-enqueueing the same chapter', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    mockGetJob.mockResolvedValueOnce({
      getState: vi.fn().mockResolvedValue('failed'),
      remove,
    });

    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe' });

    expect(remove).toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1 }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });
});