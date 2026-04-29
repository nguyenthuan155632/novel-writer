import { describe, it, expect, vi } from 'vitest';

vi.mock('drizzle-orm', () => ({
  eq: (_col: unknown, _val: unknown) => 'eq',
  and: (..._args: unknown[]) => 'and',
  lte: (_col: unknown, _val: unknown) => 'lte',
  gte: (_col: unknown, _val: unknown) => 'gte',
}));

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ startChapter: 1, endChapter: 20 }] }) }) }),
  }),
}));

vi.mock('@novel/db/schema', () => ({
  schema: { arcs: 'arcs', pendingCanonUpdates: 'pendingCanonUpdates' },
}));

import { resolveEffectiveMode } from '../../src/policy/mode-escalation.ts';

describe('resolveEffectiveMode', () => {
  it('keeps safe mode untouched', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 5, userMode: 'safe' });
    expect(r.mode).toBe('safe');
    expect(r.reasons).toHaveLength(0);
  });

  it('escalates first chapter', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 1, userMode: 'semi_auto' });
    expect(r.mode).toBe('safe');
    expect(r.reasons).toContain('first_chapter');
  });
});