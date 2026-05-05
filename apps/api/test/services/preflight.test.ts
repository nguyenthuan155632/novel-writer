import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelectLimit = vi.fn();
const mockBudgetPreflightOrThrow = vi.fn();

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: mockSelectLimit,
          }),
          limit: mockSelectLimit,
        }),
      }),
    }),
  }),
}));

vi.mock('../../src/services/budget-guard.ts', () => ({
  BudgetGuard: class {
    preflightOrThrow = mockBudgetPreflightOrThrow;
  },
}));

describe('runGeneratePreflight', () => {
  beforeEach(() => {
    mockSelectLimit.mockReset();
    mockBudgetPreflightOrThrow.mockReset();
  });

  it('passes when all checks pass', async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: 'bible-1' }])
      .mockResolvedValueOnce([{ id: 'arc-1' }])
      .mockResolvedValueOnce([{ activeProvider: 'openrouter' }]);
    mockBudgetPreflightOrThrow.mockResolvedValue(undefined);

    const { runGeneratePreflight } = await import('../../src/services/preflight.ts');
    const result = await runGeneratePreflight({ storyId: 'story-1', chapterNumber: 3 });

    expect(result).toEqual({ ok: true, failed: [] });
  });

  it('returns failed checks when budget guard fails', async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: 'bible-1' }])
      .mockResolvedValueOnce([{ id: 'arc-1' }])
      .mockResolvedValueOnce([{ activeProvider: 'openrouter' }]);
    mockBudgetPreflightOrThrow.mockRejectedValue(new Error('budget_breach:daily:100.0%'));

    const { runGeneratePreflight } = await import('../../src/services/preflight.ts');
    const result = await runGeneratePreflight({ storyId: 'story-1', chapterNumber: 3 });

    expect(result.ok).toBe(false);
    expect(result.failed).toContainEqual({
      key: 'budget_guard',
      pass: false,
      reason: 'budget_breach:daily:100.0%',
    });
  });
});
