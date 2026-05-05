import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { autoFixerPromptV2 } from '../../src/prompts/auto-fixer.v2.ts';

describe('autoFixerPromptV2', () => {
  it('adds creator frame on system side', () => {
    const built = autoFixerPromptV2.build({
      serializedContext: 'CTX',
      chapterContent: 'Body',
      chapterTitle: 'Chương 1',
      chapterNumber: 1,
      issues: [{ code: 'style', severity: 'low', message: 'fix style' }],
      genreDef: findGenre('do_thi'),
      storyOptions: {},
    });

    expect(built.system).toContain('<creator_frame>');
    expect(built.system).toContain('Forbidden rules là ranh giới cứng');
  });
});
