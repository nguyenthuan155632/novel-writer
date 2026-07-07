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

  it('spreads early seeds and avoids forcing chapter one into mystery action', () => {
    const built = sagaPlannerPromptV2.build({
      targetChapters: 120,
      bibleCompact: 'Một thị trấn ven sông có các lời đồn cũ.',
      genreDef: findGenre('dong_phuong_huyen_bi'),
      storyOptions: { pacing: 'slow' },
    });
    expect(built.system).toContain('Đừng dồn seed vào các chương 1-5');
    expect(built.system).toContain('trong 3 chương đầu tối đa 1 seed quan trọng');
    expect(built.system).toContain('chi tiết đời sống có hai lớp nghĩa');
    expect(built.system).toContain('Tránh lập kế hoạch khiến chương đầu phải mở bằng biến cố lớn');
    expect(built.system).toContain('turning point đầu không được ghi rõ "(chương 1)"');
    expect(built.system).toContain('không đặt turning point lớn vào chương 1');
  });
});
