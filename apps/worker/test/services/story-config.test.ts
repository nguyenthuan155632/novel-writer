import { describe, expect, it, vi } from 'vitest';

const mockRows: Array<{ overrides: Record<string, unknown> }> = [];

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: async () => mockRows,
      }),
    }),
  }),
}));

vi.mock('@novel/db/schema', () => ({
  storySettings: {},
}));

describe('loadEffectiveStoryConfig', () => {
  it('merges story settings overrides into effective generation config', async () => {
    mockRows.length = 0;
    mockRows.push({
      overrides: {
        context: { TOKEN_BUDGET_NORMAL: 4321 },
        model: { routes: { writer: 'google/gemini-2.5-flash' } },
      },
    });

    const { loadEffectiveStoryConfig } = await import('../../src/services/story-config.js');
    const config = await loadEffectiveStoryConfig('story-1');

    expect(config.context.TOKEN_BUDGET_NORMAL).toBe(4321);
    expect(config.model.routes.writer).toBe('google/gemini-2.5-flash');
  });
});
