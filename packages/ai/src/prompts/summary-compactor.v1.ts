import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type SummaryCompactorPromptInput = {
  chapterNumber: number;
  chapterContent: string;
  previousShortSummary: string;
  bibleCompact: string;
};

export const summaryCompactorPromptV1: DualPromptTemplate = {
  agentRole: 'summary_compactor',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là summary-compactor cho tiểu thuyết tiên hiệp. Tóm tắt chương vừa viết thành 2 phiên bản: ngắn (tối đa 300 ký tự Unicode, cho context packet) và chi tiết (tối đa 2000 ký tự, cho retrieval).
Quy tắc:
- Chỉ tóm tắt những gì THỰC SỰ xảy ra.
- keyEvents là sự kiện quan trọng nhất, ưu tiên conflict, đột phá, plot twist.
- charactersPresent là nhân vật CÓ MẶT trong chương.
- moodShift so với chương trước (nếu có).
- Trả JSON đúng schema.`,
    user: [
      `# CHƯƠNG ${String(input.chapterNumber)}`,
      input.chapterContent,
      '',
      `# TÓM TẮT CHƯƠNG TRƯỚC`,
      input.previousShortSummary,
      '',
      `# BIBLE (tham khảo)`,
      input.bibleCompact,
      '',
      `Tóm tắt chương. Trả JSON theo SummaryCompactorOutput schema.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(summaryCompactorPromptV1);
