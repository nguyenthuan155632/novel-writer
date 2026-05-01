import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { bibleGeneratorPromptV2, type BibleGeneratorV2Input } from '../../src/prompts/bible-generator.v2.ts';

const baseInput = (genreSlug: string): BibleGeneratorV2Input => ({
  premise: 'Một nhân vật ly kỳ bị cuốn vào âm mưu lớn.',
  target_chapter_count: 1000,
  genreDef: findGenre(genreSlug),
  personalityDef: findPersonality('tram_on'),
  storyOptions: {},
});

describe('bibleGeneratorPromptV2', () => {
  it('rendered prompt for genre=do_thi does NOT contain "tiên hiệp" or "huyền huyễn"', () => {
    const out = bibleGeneratorPromptV2.render(baseInput('do_thi') as unknown as Record<string, unknown>);
    expect(out.toLowerCase()).not.toContain('tiên hiệp');
    expect(out.toLowerCase()).not.toContain('huyền huyễn');
    expect(out).toContain('Đô thị');
    expect(out).toContain('GENRE CONTRACT');
  });

  it('rendered prompt for genre=tien_hiep contains the contract and allowed tropes', () => {
    const out = bibleGeneratorPromptV2.render(baseInput('tien_hiep') as unknown as Record<string, unknown>);
    expect(out).toContain('Tiên hiệp');
    expect(out).toContain('cảnh giới');
    expect(out).toContain('power_system_kind');
  });
});
