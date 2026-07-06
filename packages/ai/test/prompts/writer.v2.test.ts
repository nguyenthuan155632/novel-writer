import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { writerPromptV2 } from '../../src/prompts/writer.v2.ts';

import { WRITER_SYSTEM_PROMPT_TEMPLATE } from '../../src/prompts/writer.v2.ts';

describe('writerPromptV2', () => {
  it('system prompt includes chosen genre label and stays byte-equal to template', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('do_thi'),
    } as unknown as Record<string, unknown>);

    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system.toLowerCase()).not.toContain('huyền huyễn');
    expect(built.system).toContain('Đô thị');
    expect(built.system).toBe(
      WRITER_SYSTEM_PROMPT_TEMPLATE.replace('__GENRE_LABEL__', 'Đô thị'),
    );
  });

  it('adds no XML inserts when optional data is empty', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('do_thi'),
    } as unknown as Record<string, unknown>);

    expect(built.user).not.toContain('<consistent_chronology>');
    expect(built.user).not.toContain('<entry_state>');
    expect(built.user).not.toContain('<chapter_tail_bridge>');
    expect(built.user).not.toContain('<emotional_arc>');
    expect(built.user).not.toContain('<parallel_threads>');
  });

  it('adds only relevant XML inserts for partial data', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('do_thi'),
      chapterTailBridge: 'Tail line',
      emotionalArc: ['fear to resolve'],
      parallelThreads: ['thread-a: covert infiltration (ch4-ch7)'],
    } as unknown as Record<string, unknown>);

    expect(built.user).toContain('<chapter_tail_bridge>\nTail line\n</chapter_tail_bridge>');
    expect(built.user).toContain('<emotional_arc>\n- fear to resolve\n</emotional_arc>');
    expect(built.user).toContain('<parallel_threads>\n- thread-a: covert infiltration (ch4-ch7)\n</parallel_threads>');
    expect(built.user).not.toContain('<consistent_chronology>');
    expect(built.user).not.toContain('<entry_state>');
  });

  it('tells the writer to let latest summaries override stale character state conflicts', () => {
    const built = writerPromptV2.build({
      serializedContext: [
        '# ACTIVE CHARACTERS',
        '- Lâm Dạ [alive] realm=Tụ Khí đỉnh phong faction=Lâm gia',
        '# RECENT SUMMARIES',
        '- Ch5: Lâm Dạ vừa đột phá lên Trúc Cơ sau trận đấu.',
      ].join('\n'),
      genreDef: findGenre('tien_hiep'),
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('RECENT SUMMARIES');
    expect(built.system).toContain('latest completed chapter');
    expect(built.system).toContain('override stale ACTIVE CHARACTERS');
    expect(built.system).toContain('KHÔNG tái diễn hoặc giải quyết lại sự kiện/conflict đã hoàn tất');
    expect(built.system).toContain('phát triển hậu quả, biến chứng, hoặc mục tiêu kế tiếp');
  });

  it('guards comedic voice against modern consumer language', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('huyen_huyen'),
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('Hài hước phải dùng hình ảnh phù hợp thế giới');
    expect(built.system).toContain('khử mùi');
    expect(built.system).toContain('khách sạn, minibar, TV, đánh giá một sao, free, CLB, GPS, resort, sếp cuối, phim, kịch bản');
    expect(built.system).toContain('KHÔNG tự ý chuyển thoại thân mật hiện đại như tôi/anh/em/cậu');
    expect(built.system).toContain('tự rà soát và thay mọi xưng hô hiện đại sai bối cảnh');
  });

  it('sets a hard minimum below the requested chapter length range', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('huyen_huyen'),
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('Viết 2200-2600 từ; không được dưới 2000 từ hoặc vượt 3000 từ');
    expect(built.system).toContain('Không viết dạng tóm tắt nén');
    expect(built.system).toContain('tự mở rộng trước khi trả lời');
  });
});
