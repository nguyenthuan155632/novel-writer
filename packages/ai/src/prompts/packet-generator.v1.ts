import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type PacketGeneratorPromptInput = {
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
};

export const packetGeneratorPromptV1: DualPromptTemplate = {
  agentRole: 'packet_generator',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là planner chương cho tiểu thuyết tiên hiệp tiếng Việt. Trả JSON đúng schema. KHÔNG viết nội dung chương — chỉ kế hoạch.`,
    user: [
      `# BIBLE`, input.bibleCompact, '',
      `# ARC HIỆN TẠI`, input.arcSummary, '',
      `# ARC GOALS`, input.arcGoals, '',
      `# 5 CHƯƠNG GẦN NHẤT`,
      ...(input.recentChapterSummaries as unknown as { chapterNumber: number; summary: string }[]).map(s => `- Ch${s.chapterNumber}: ${s.summary}`),
      '',
      `# NHÂN VẬT ĐANG HOẠT ĐỘNG`,
      ...(input.activeCharacters as unknown as { name: string; currentRealm?: string; status: string; faction?: string }[]).map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'}`),
      '',
      `# THREADS ĐANG MỞ`,
      ...(input.openThreads as unknown as { title: string; state: string }[]).map(t => `- ${t.title} [${t.state}]`),
      '',
      `# SEEDS NÊN PLANT TRONG CHƯƠNG NÀY`,
      ...(input.duePlantedSeeds as unknown as { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[]).map(s => `- (id=${s.id}) MUST plant: "${s.seedText}" — pays off: ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`),
      '',
      (input.overdueThreads as unknown as { title: string; introducedChapter: number }[]).length > 0 ? `# THREAD QUÁ HẠN — cần resolve sớm:` : '',
      ...(input.overdueThreads as unknown as { title: string; introducedChapter: number }[]).map(t => `- ${t.title} (intro ch${t.introducedChapter})`),
      '',
      `# CẤM`, input.forbiddenRules, '',
      `# YÊU CẦU`,
      `Lập kế hoạch chương ${String(input.chapterNumber)}.`,
      `BẮT BUỘC: ít nhất 1 conflict + 1 cliffhanger.`,
      `BẮT BUỘC: requiredEvents phải gồm các "MUST plant" seed ở trên (gắn đúng seedId). NẾU KHÔNG có seedId dạng UUID từ mục "# SEEDS PHẢI PLANT", TUYỆT ĐỐI KHÔNG tự bịa seedId (bỏ trống trường seedId).`,
      `GIỚI HẠN ĐỘ DÀI: goal <= 500 ký tự; conflict <= 500; cliffhanger <= 500; mỗi requiredEvents.description <= 500.`,
      `Viết ngắn gọn, trọn ý, không lặp. Không xuống dòng quá dài trong một field.`,
      `forbiddenMoves: liệt kê những đòn từ # CẤM mà chương này nên tránh dùng.`,
      `Trả về JSON theo schema ChapterPacket.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(packetGeneratorPromptV1);