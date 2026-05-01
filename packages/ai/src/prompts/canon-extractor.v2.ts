import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type CanonExtractorV2PromptInput = {
  chapterNumber: number;
  chapterContent: string;
  bibleCompact: string;
  canonSnapshot: string;
  plantedSeeds: { id: string; seedText: string; payoffDescription: string; status: string }[];
  recentSummary: string;
};

export const canonExtractorPromptV2: DualPromptTemplate = {
  agentRole: 'canon_extractor',
  version: 'v2',
  build: (input) => ({
    system: `Bạn là canon-extractor cho một tiểu thuyết tiếng Việt. Phân tích chương vừa viết, trích xuất mọi thay đổi canon.
Quy tắc:
- Chỉ trích những gì CHẮC CHẮN xảy ra trong chương, KHÔNG suy diễn.
- Realm regression (nếu có hệ thống cảnh giới) phải có intentionalRegression=true CHỈ KHI có đoạn nội tâm/hội thoại giải thích.
- Thread chỉ resolve khi có scene closure rõ ràng.
- Canon fact importance='locked' chỉ dành cho quy tắc thế giới cốt lõi.
- Trả JSON đúng schema ExtractorOutput.`,
    user: [
      `# CHƯƠNG ${String(input.chapterNumber)}`,
      input.chapterContent,
      '',
      `# BIBLE (tóm tắt)`,
      input.bibleCompact,
      '',
      `# CANON SNAPSHOT (hiện tại)`,
      input.canonSnapshot,
      '',
      `# SEEDS ĐÃ PLANT`,
      ...(input.plantedSeeds as { id: string; seedText: string; payoffDescription: string; status: string }[]).map(s =>
        `- (id=${s.id}) "${s.seedText}" — payoff: ${s.payoffDescription} [${s.status}]`
      ),
      '',
      `# TÓM TẮT CHƯƠNG TRƯỚC`,
      input.recentSummary,
      '',
      `Trích xuất canon changes. Trả JSON theo ExtractorOutput schema.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(canonExtractorPromptV2);
