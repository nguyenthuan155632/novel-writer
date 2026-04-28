import { describe, it, expect } from 'vitest';
import { runRefreshArcSummaryJob } from '../../src/jobs/refresh-arc-summary.js';

describe('refreshArcSummary', () => {
  it('returns skipped without throwing', async () => {
    const fakeJob = { id: 't1', data: { storyId: 's', arcId: 'a' } } as any;
    const result = await runRefreshArcSummaryJob(fakeJob.data, { logger: { warn: () => {} } } as any);
    expect(result.status).toBe('skipped');
  });
});