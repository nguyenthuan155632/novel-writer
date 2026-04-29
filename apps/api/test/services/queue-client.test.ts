import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn();
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    getJob: vi.fn().mockResolvedValue(null),
  })),
}));
vi.mock('ioredis', () => ({ default: vi.fn() }));

import { enqueueGenerateChapter } from '../../src/services/queue-client.js';

describe('enqueueGenerateChapter', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: 'gen-s1-1' });
  });

  it('uses deterministic jobId for idempotency', async () => {
    await enqueueGenerateChapter({ storyId: 's1', chapterNumber: 1, mode: 'safe' });
    expect(mockAdd).toHaveBeenCalledWith(
      'generate-chapter',
      expect.objectContaining({ storyId: 's1', chapterNumber: 1 }),
      expect.objectContaining({ jobId: 'gen-s1-1' }),
    );
  });
});