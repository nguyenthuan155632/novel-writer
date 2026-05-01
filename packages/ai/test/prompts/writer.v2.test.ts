import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { writerPromptV2 } from '../../src/prompts/writer.v2.ts';

describe('writerPromptV2', () => {
  it('system prompt includes the chosen genre label and not "tiên hiệp/huyền huyễn"', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('do_thi'),
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system.toLowerCase()).not.toContain('huyền huyễn');
    expect(built.system).toContain('Đô thị');
    expect(built.user).toBe('CTX');
  });
});
