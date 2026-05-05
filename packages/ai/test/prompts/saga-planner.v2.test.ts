import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { sagaPlannerPromptV2 } from '../../src/prompts/saga-planner.v2.ts';

describe('sagaPlannerPromptV2', () => {
  it('renders without "tiên hiệp" for non-cultivation genre', () => {
    const built = sagaPlannerPromptV2.build({
      targetChapters: 200,
      bibleCompact: 'Bible compact text',
      genreDef: findGenre('do_thi'),
      storyOptions: {},
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system).toContain('Đô thị');
  });

  it('adds planner frame on system side', () => {
    const built = sagaPlannerPromptV2.build({
      targetChapters: 200,
      bibleCompact: 'Bible compact text',
      genreDef: findGenre('do_thi'),
      storyOptions: {},
    });
    expect(built.system).toContain('<planner_frame>');
    expect(built.system).toContain('Suy nghĩ nội bộ trước, sau đó mới xuất JSON cuối cùng');
  });
});
