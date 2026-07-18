import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { packetGeneratorPromptV2 } from '../../src/prompts/packet-generator.v2.ts';

describe('packetGeneratorPromptV2', () => {
  it('§1.9 injects must_include_seeds block when seeds approaching deadline', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 10, arcGoals: 'g',
      mustIncludeSeeds: [{ id: 'seed-abc', seedText: 'bí mật huyết mạch', plantWindowEnd: 11 }],
      genreDef: findGenre('tien_hiep'),
      personalityDef: findPersonality('cunning_pragmatic'),
      storyOptions: {},
    });
    expect(built.user).toContain('<must_include_seeds priority="critical">');
    expect(built.user).toContain('seedId="seed-abc"');
    expect(built.user).toContain('bí mật huyết mạch');
    expect(built.user).toContain('plantWindowEnd=ch11');
  });

  it('keeps ordinary due seeds optional instead of forcing them into chapter 1', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [],
      duePlantedSeeds: [{ id: 'seed-soft', seedText: 'a small tea rumor', payoffDescription: 'later payoff', plantWindowEnd: 10 }],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('huyen_huyen'),
      personalityDef: findPersonality('humorous_slick'),
      storyOptions: {},
    });

    expect(built.user).toContain('# SEEDS CÓ THỂ GIEO TỪ CHƯƠNG NÀY');
    expect(built.user).toContain('có thể plant nếu tự nhiên');
    expect(built.user).not.toContain('MUST plant: "a small tea rumor"');
    expect(built.user).toContain('Chỉ các seed trong <must_include_seeds> mới bắt buộc');
  });

  it('guides long-serial openings toward baseline routine before major mystery escalation', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [],
      duePlantedSeeds: [{ id: 'seed-soft', seedText: 'a strange feather', payoffDescription: 'later payoff', plantWindowEnd: 3 }],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('dong_phuong_huyen_bi'),
      personalityDef: findPersonality('humorous_slick'),
      storyOptions: { pacing: 'slow' },
    });

    expect(built.user).toContain('MỞ ĐẦU TIỂU THUYẾT DÀI TẬP');
    expect(built.user).toContain('Không bắt buộc có manh mối trong từng chương mở đầu');
    expect(built.user).toContain('CHƯƠNG 1-2 BASELINE');
    expect(built.user).toContain('conflict và requiredEvents PHẢI thuần đời sống');
    expect(built.user).toContain('KHÔNG KÉO TURNING POINT TƯƠNG LAI VỀ SỚM');
    expect(built.user).toContain('không đưa vật chứng, reveal, cuộc gặp, điều tra');
    expect(built.user).toContain('MYSTERY_SETUP ĐẦU ARC');
    expect(built.user).toContain('KHÔNG tự thêm vật chứng mới, máu, dấu theo dõi');
    expect(built.user).toContain('NHẤT QUÁN PURPOSE/ENDING');
    expect(built.user).toContain('KHÔNG đưa cảnh nhân vật tự đi rình');
    expect(built.user).toContain('SEED MỀM');
    expect(built.user).toContain('không được tự biến thành biến cố chính');
  });

  it('requires new state and varied scene patterns after the baseline chapters', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a',
      recentChapterSummaries: [
        { chapterNumber: 3, summary: 'Nhân vật vừa xử lý một thương nhân rồi trở về nghỉ.' },
        { chapterNumber: 4, summary: 'Nhân vật lại nghe tin đồn cũ rồi đi ngủ.' },
      ],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 5, arcGoals: 'g',
      genreDef: findGenre('huyen_huyen'),
      personalityDef: findPersonality('humorous_slick'),
      storyOptions: {},
    });

    expect(built.user).toContain('TỪ CHƯƠNG 3');
    expect(built.user).toContain('thay đổi trạng thái cụ thể và mới');
    expect(built.user).toContain('CHỐNG LẶP NHỊP');
    expect(built.user).toContain('không được vừa mở đầu vừa kết thúc chương');
  });

  it('requires later packets to continue the prior chapter instead of resetting to morning', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 2, arcGoals: 'g',
      prevChapterTailContent: 'Quân Thiên Miện rời khỏi trà quán khi trời vừa sẩm tối.',
      genreDef: findGenre('huyen_huyen'),
      personalityDef: findPersonality('cunning_pragmatic'),
      storyOptions: {},
    });

    expect(built.user).toContain('NỐI CHƯƠNG BẮT BUỘC');
    expect(built.user).toContain('requiredEvents[0]');
    expect(built.user).toContain('TIME_SKIP: ');
  });

  it('no critical must_include_seeds block when none provided', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('tien_hiep'),
      personalityDef: findPersonality('cunning_pragmatic'),
      storyOptions: {},
    });
    expect(built.user).not.toContain('<must_include_seeds priority="critical">');
  });

  it('system prompt embeds genre + personality + storyOptions blocks', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: 'no harem', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('cao_vo'),
      personalityDef: findPersonality('overbearing_decisive'),
      storyOptions: { tone: 'serious' },
    });
    expect(built.system).toContain('GENRE CONTRACT');
    expect(built.system).toContain('Cao võ');
    expect(built.system).toContain('PERSONALITY CONTRACT');
    expect(built.system).toContain('Bá đạo, quyết đoán');
    expect(built.system).toContain('Tone: Nghiêm túc');
  });

  it('guards packet humor against modern consumer language', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('huyen_huyen'),
      personalityDef: findPersonality('humorous_slick'),
      storyOptions: {},
    });

    expect(built.user).toContain('Hài hước phải hợp thế giới');
    expect(built.user).toContain('khử mùi');
  });

  it('does not require a cliffhanger and asks for soft purpose/ending fields', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('huyen_huyen'),
      personalityDef: findPersonality('humorous_slick'),
      storyOptions: {},
    });

    expect(built.user).not.toContain('BẮT BUỘC: ít nhất 1 conflict + 1 cliffhanger.');
    expect(built.user).toContain('chapterPurpose');
    expect(built.user).toContain('endingMode');
    expect(built.user).toContain('cliffhanger chỉ là tùy chọn');
  });
});
