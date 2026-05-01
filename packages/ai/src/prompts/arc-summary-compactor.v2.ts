import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export const arcSummaryCompactorPromptV2: DualPromptTemplate = {
  agentRole: 'summary_compactor',
  version: 'arc_v2',
  build: (input) => ({
    system: `Bạn là biên tập tóm lược arc cho một tiểu thuyết dài tiếng Việt. Nhận tóm tắt từng chương, viết LẠI một bản tóm tắt arc dài tối đa 1200 từ tiếng Việt, giữ:
- mọi sự kiện có liên quan đến seeds/locked facts
- mọi đột phá / chuyển biến quan hệ chính (nếu có)
- diễn biến chính đã xảy ra (không tiên đoán tương lai)
Bỏ mô tả cảnh, chi tiết miêu tả nhỏ, dialog không quan trọng. Trả về plain text duy nhất, không markdown.`,
    user: `Arc: ${String(input.arcTitle)}\n\n${Array.isArray(input.perChapterSummaries) ? (input.perChapterSummaries as {chapterNumber: number; summary: string}[]).map((c) => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n\n') : ''}`,
  }),
};

registerPrompt(arcSummaryCompactorPromptV2);
