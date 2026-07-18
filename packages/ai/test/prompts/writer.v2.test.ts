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

  it('requires post-baseline chapters to progress and vary routine openings', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('tien_hiep'),
      chapterTailBridge: 'Nhân vật vừa rời khỏi cuộc gặp trong tâm trạng cảnh giác.',
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('Từ chương 3');
    expect(built.system).toContain('thay đổi ít nhất một trạng thái cụ thể');
    expect(built.system).toContain('Không mở chương bằng cảnh nhân vật tỉnh dậy, tắm rửa');
    expect(built.system).toContain('không dùng cùng một thói quen để vừa mở đầu vừa kết thúc chương');
  });

  it('requires a later chapter to continue its tail unless a justified time skip is planned', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('tien_hiep'),
      chapterTailBridge: 'Quân Thiên Miện vừa rời khỏi trà quán khi trời sẩm tối.',
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('chapter_tail_bridge hoặc entry_state');
    expect(built.system).toContain('Không tự nhảy sang buổi sáng/ngày mới');
    expect(built.system).toContain('CHAPTER PLAN có "TIME_SKIP:"');
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

  it('uses soft length guidance and supports quiet endings', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('huyen_huyen'),
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('Ưu tiên khoảng 1800-2800 từ');
    expect(built.system).toContain('không cần ép đủ chữ');
    expect(built.system).toContain('Không viết dạng tóm tắt nén');
    expect(built.system).toContain('Không bắt buộc cliffhanger');
    expect(built.system).toContain('quiet_transition');
  });

  it('keeps future seeds and turning points out of the current chapter unless the packet asks for them', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('dong_phuong_huyen_bi'),
    } as unknown as Record<string, unknown>);

    expect(built.system).toContain('CHAPTER PLAN / PACKET là ranh giới cụ thể của chương này');
    expect(built.system).toContain('Không tự thêm nhân vật, cuộc gặp, reveal, seed payoff, turning point');
    expect(built.system).toContain('KHÔNG đưa sự kiện đó xảy ra sớm');
    expect(built.system).toContain('Nếu chapterPurpose là mystery_setup ở đầu arc');
    expect(built.system).toContain('KHÔNG tự tăng thành vật chứng mới, máu');
    expect(built.system).toContain('KHÔNG kết bằng thông tin nhân vật POV không biết');
    expect(built.system).toContain('KHÔNG kết bằng lời hứa mơ hồ của người kể');
    expect(built.system).toContain('ARC SUMMARY + SAGA SUMMARY (narrative direction dài hạn, không phải checklist');
    expect(built.system).toContain('chỉ gieo seed khi packet/OPTIONAL SEED TEXTURE yêu cầu rõ');
  });
});
