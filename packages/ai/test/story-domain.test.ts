import { describe, expect, it, vi } from 'vitest';

const storiesRows: Array<Record<string, unknown>> = [];
const settingsRows: Array<Record<string, unknown>> = [];

vi.mock('@novel/db', () => {
  const select = (rows: Array<Record<string, unknown>>) => ({
    from: () => ({ where: async () => rows }),
  });
  return {
    getDb: () => ({
      select: () => {
        let next: 'stories' | 'settings' = 'stories';
        return {
          from: (table: { __name?: string }) => {
            next = table.__name === 'story_settings' ? 'settings' : 'stories';
            return { where: async () => (next === 'stories' ? storiesRows : settingsRows) };
          },
        };
      },
    }),
  };
});

vi.mock('@novel/db/schema', () => ({
  stories: { __name: 'stories' },
  storySettings: { __name: 'story_settings' },
}));

describe('loadStoryDomainContext', () => {
  it('returns genre def, personality def, parsed storyOptions and family', async () => {
    storiesRows.length = 0;
    settingsRows.length = 0;
    storiesRows.push({
      id: 's1', genre: 'do_thi', mainCharacterPersonality: 'cunning_pragmatic',
    });
    settingsRows.push({
      storyId: 's1',
      overrides: { storyOptions: { tone: 'serious', pov: 'first' } },
    });

    const { loadStoryDomainContext } = await import('../src/story-domain.ts');
    const db = (await import('@novel/db')).getDb();
    const out = await loadStoryDomainContext(db as any, 's1');

    expect(out.genreDef.slug).toBe('do_thi');
    expect(out.genreFamily).toBe('urban');
    expect(out.personalityDef.slug).toBe('cunning_pragmatic');
    expect(out.storyOptions.tone).toBe('serious');
    expect(out.storyOptions.pov).toBe('first');
  });

  it('falls back to empty storyOptions when settings missing', async () => {
    storiesRows.length = 0;
    settingsRows.length = 0;
    storiesRows.push({
      id: 's2', genre: 'tien_hiep', mainCharacterPersonality: 'tram_on',
    });

    const { loadStoryDomainContext } = await import('../src/story-domain.ts');
    const db = (await import('@novel/db')).getDb();
    const out = await loadStoryDomainContext(db as any, 's2');
    expect(out.storyOptions).toEqual({});
  });
});
