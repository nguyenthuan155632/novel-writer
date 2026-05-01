import { beforeEach, describe, expect, it, vi } from 'vitest';

const addMock = vi.fn(async (_name: string, _data: unknown, options: { jobId: string }) => ({
  id: options.jobId,
}));

vi.mock('../../src/queues.js', () => ({
  createConnection: vi.fn(() => ({})),
  createRefreshArcSummaryQueue: vi.fn(() => ({ add: addMock })),
  createRefreshSagaSummaryQueue: vi.fn(() => ({ add: vi.fn() })),
  createHighStakesReviewQueue: vi.fn(() => ({ add: vi.fn() })),
}));

describe('queue publisher', () => {
  beforeEach(() => {
    vi.resetModules();
    addMock.mockClear();
  });

  it('creates a fresh refresh-arc-summary job for repeated refreshes of the same arc', async () => {
    const { enqueueRefreshArcSummary } = await import('../../src/services/queue-publisher.js');
    const base = { storyId: 'story-1', arcId: 'arc-1' };

    await enqueueRefreshArcSummary({ ...base, traceId: 'trace-1' });
    await enqueueRefreshArcSummary({ ...base, traceId: 'trace-2' });

    const firstOptions = addMock.mock.calls[0]?.[2];
    const secondOptions = addMock.mock.calls[1]?.[2];
    expect(firstOptions?.jobId).not.toBe(secondOptions?.jobId);
  });

  it('does not include undefined in refresh-arc-summary job ids when traceId is missing at runtime', async () => {
    const { enqueueRefreshArcSummary } = await import('../../src/services/queue-publisher.js');

    await enqueueRefreshArcSummary({ storyId: 'story-1', arcId: 'arc-1' } as any);

    const options = addMock.mock.calls[0]?.[2];
    expect(options?.jobId).not.toContain('undefined');
  });

  it('creates a fresh refresh-saga-summary job for repeated refreshes of the same saga', async () => {
    const sagaAddMock = vi.fn(async (_name: string, _data: unknown, options: { jobId: string }) => ({
      id: options.jobId,
    }));
    const queues = await import('../../src/queues.js');
    vi.mocked(queues.createRefreshSagaSummaryQueue).mockReturnValue({ add: sagaAddMock } as any);

    const { enqueueRefreshSagaSummary } = await import('../../src/services/queue-publisher.js');
    const base = { storyId: 'story-1', sagaId: 'saga-1' };

    await enqueueRefreshSagaSummary({ ...base, traceId: 'trace-1' });
    await enqueueRefreshSagaSummary({ ...base, traceId: 'trace-2' });

    const firstOptions = sagaAddMock.mock.calls[0]?.[2];
    const secondOptions = sagaAddMock.mock.calls[1]?.[2];
    expect(firstOptions?.jobId).not.toBe(secondOptions?.jobId);
  });

  it('does not include undefined in refresh-saga-summary job ids when traceId is missing at runtime', async () => {
    const sagaAddMock = vi.fn(async (_name: string, _data: unknown, options: { jobId: string }) => ({
      id: options.jobId,
    }));
    const queues = await import('../../src/queues.js');
    vi.mocked(queues.createRefreshSagaSummaryQueue).mockReturnValue({ add: sagaAddMock } as any);

    const { enqueueRefreshSagaSummary } = await import('../../src/services/queue-publisher.js');

    await enqueueRefreshSagaSummary({ storyId: 'story-1', sagaId: 'saga-1' } as any);

    const options = sagaAddMock.mock.calls[0]?.[2];
    expect(options?.jobId).not.toContain('undefined');
  });
});
