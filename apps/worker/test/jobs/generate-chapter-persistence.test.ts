import { describe, expect, it } from 'vitest';

describe('generate-chapter persistence helpers', () => {
  it('persists context packet hashes and deterministic validation rows', async () => {
    const inserts: unknown[] = [];
    const db = {
      insert: (table: unknown) => ({
        values: async (value: unknown) => {
          inserts.push({ table, value });
        },
      }),
    };

    const {
      persistContextPacket,
      persistValidationRows,
    } = await import('../../src/jobs/generate-chapter.js');

    await persistContextPacket(db as any, {
      chapterId: 'chapter-1',
      hotTierHash: 'hot',
      warmTierHash: 'warm',
      coldPayload: { packet: { goal: 'g' } },
      totalInputTokens: 123,
      cachedInputTokens: 45,
      configSnapshot: { context: { TOKEN_BUDGET_NORMAL: 6000 } },
    });

    await persistValidationRows(db as any, {
      storyId: 'story-1',
      chapterId: 'chapter-1',
      checks: [
        { id: 'word_count', severity: 'medium', pass: true, issues: [] },
        { id: 'style_red_flags', severity: 'medium', pass: false, issues: ['bad style'] },
      ],
      validatorModel: 'deterministic',
    });

    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toEqual(expect.objectContaining({
      value: expect.objectContaining({
        chapterId: 'chapter-1',
        hotTierHash: 'hot',
        warmTierHash: 'warm',
        totalInputTokens: 123,
        cachedInputTokens: 45,
      }),
    }));
    expect(inserts[1]).toEqual(expect.objectContaining({
      value: expect.arrayContaining([
        expect.objectContaining({
          storyId: 'story-1',
          chapterId: 'chapter-1',
          pass: false,
          severity: 'medium',
          issues: ['bad style'],
          validatorModel: 'deterministic',
        }),
      ]),
    }));
  });
});
