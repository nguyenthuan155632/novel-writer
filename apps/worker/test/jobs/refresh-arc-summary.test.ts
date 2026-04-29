import { describe, it, expect, vi } from 'vitest';

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  }),
}));

vi.mock('@novel/db/schema', () => ({
  arcs: {},
  chapters: {},
  chapterSummaries: {},
}));

vi.mock('@novel/ai', () => ({
  ArcSummaryCompactorAgent: class {
    async compact() { return { summary: 'test', usage: { inputTokens: 0, outputTokens: 0 } }; }
  },
}));

vi.mock('@novel/ai/providers/opencode', () => ({
  OpenCodeProvider: class {},
}));

vi.mock('@novel/ai/llm-call-logger', () => ({
  LoggedLLMProvider: class {
    async call() { return '{}'; }
  },
  makeDrizzleRecorder: () => async () => {},
}));

describe('refreshArcSummary', () => {
  it('returns skipped when no arc found', async () => {
    const { runRefreshArcSummaryJob } = await import('../../src/jobs/refresh-arc-summary.js');
    const fakeLogger = { child: () => fakeLogger, warn: () => {}, info: () => {}, error: () => {} };
    const result = await runRefreshArcSummaryJob(
      { storyId: 's', arcId: 'nonexistent', traceId: 't' },
      { logger: fakeLogger as any },
    );
    expect(result.status).toBe('skipped');
  });
});
