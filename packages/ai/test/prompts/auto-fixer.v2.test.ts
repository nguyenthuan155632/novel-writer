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

  it('instructs deterministic register and length repairs explicitly', () => {
    const built = autoFixerPromptV2.build({
      serializedContext: 'CTX',
      chapterContent: 'Body',
      chapterTitle: 'Chương 2',
      chapterNumber: 2,
      issues: [
        { code: 'forbidden_move', severity: 'critical', message: 'Vi phạm xưng hô hiện đại: "mày".' },
        { code: 'word_count_target', severity: 'high', message: 'Chương vượt mục tiêu.' },
      ],
      genreDef: findGenre('huyen_huyen'),
      storyOptions: {},
    });

    expect(built.system).toContain('phải thay toàn bộ "tôi/anh/em/cậu/mày/tao"');
    expect(built.system).toContain('KHÔNG thay bằng từ đồng nghĩa hiện đại khác như "miễn phí/không thu phí"');
    expect(built.system).toContain('phải mở rộng chương lên ít nhất 2200 từ');
    expect(built.system).toContain('không chỉ thêm vài câu tóm tắt');
    expect(built.system).toContain('phải nén còn 2200-2600 từ');
    expect(built.user).toContain('[critical] forbidden_move');
    expect(built.user).toContain('[high] word_count_target');
  });
});
