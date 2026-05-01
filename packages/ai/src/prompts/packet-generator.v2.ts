import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export type PacketGeneratorV2PromptInput = {
  bibleCompact: string;
  arcSummary: string;
  recentChapterSummaries: { chapterNumber: number; summary: string }[];
  activeCharacters: { name: string; currentRealm?: string; status: string; faction?: string }[];
  openThreads: { title: string; state: string }[];
  duePlantedSeeds: { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[];
  overdueThreads: { title: string; introducedChapter: number }[];
  forbiddenRules: string;
  chapterNumber: number;
  arcGoals: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
};

export const packetGeneratorPromptV2: DualPromptTemplate = {
  agentRole: 'packet_generator',
  version: 'v2',
  build: (input) => {
    const genreDef = input.genreDef as GenreDef;
    const personalityDef = input.personalityDef as PersonalityDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;
    const recent = input.recentChapterSummaries as { chapterNumber: number; summary: string }[];
    const chars = input.activeCharacters as { name: string; currentRealm?: string; status: string; faction?: string }[];
    const threads = input.openThreads as { title: string; state: string }[];
    const seeds = input.duePlantedSeeds as { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[];
    const overdue = input.overdueThreads as { title: string; introducedChapter: number }[];

    return {
      system: `Bạn là planner chương cho tiểu thuyết ${genreDef.viLabel} tiếng Việt. Trả JSON đúng schema. KHÔNG viết nội dung chương — chỉ kế hoạch.

${renderGenreContract(genreDef, storyOptions)}

${renderPersonalityContract(personalityDef)}

${renderStoryOptionsBlock(storyOptions)}`,
      user: [
        `# BIBLE`, input.bibleCompact, '',
        `# ARC HIỆN TẠI`, input.arcSummary, '',
        `# ARC GOALS`, input.arcGoals, '',
        `# 5 CHƯƠNG GẦN NHẤT`,
        ...recent.map(s => `- Ch${s.chapterNumber}: ${s.summary}`),
        '',
        `# NHÂN VẬT ĐANG HOẠT ĐỘNG`,
        ...chars.map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'}`),
        '',
        `# THREADS ĐANG MỞ`,
        ...threads.map(t => `- ${t.title} [${t.state}]`),
        '',
        `# SEEDS NÊN PLANT TRONG CHƯƠNG NÀY`,
        ...seeds.map(s => `- (id=${s.id}) MUST plant: "${s.seedText}" — pays off: ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`),
        '',
        overdue.length > 0 ? `# THREAD QUÁ HẠN — cần resolve sớm:` : '',
        ...overdue.map(t => `- ${t.title} (intro ch${t.introducedChapter})`),
        '',
        `# CẤM`, input.forbiddenRules, '',
        `# YÊU CẦU`,
        `Lập kế hoạch chương ${String(input.chapterNumber)}. BÁM ĐÚNG GENRE CONTRACT và PERSONALITY CONTRACT ở trên.`,
        `BẮT BUỘC: ít nhất 1 conflict + 1 cliffhanger.`,
        `BẮT BUỘC: requiredEvents phải gồm các "MUST plant" seed ở trên (gắn đúng seedId). NẾU KHÔNG có seedId dạng UUID từ mục "# SEEDS NÊN PLANT", TUYỆT ĐỐI KHÔNG tự bịa seedId (bỏ trống trường seedId).`,
        `GIỚI HẠN ĐỘ DÀI: goal <= 500 ký tự; conflict <= 500; cliffhanger <= 500; mỗi requiredEvents.description <= 500.`,
        `Viết ngắn gọn, trọn ý, không lặp.`,
        `forbiddenMoves: liệt kê những đòn từ # CẤM mà chương này nên tránh dùng.`,
        `Trả về JSON theo schema ChapterPacket.`,
      ].filter(Boolean).join('\n'),
    };
  },
};

registerPrompt(packetGeneratorPromptV2);
