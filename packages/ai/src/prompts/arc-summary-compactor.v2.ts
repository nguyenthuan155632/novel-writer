import { registerPrompt, type DualPromptTemplate } from "./registry.ts";

export const arcSummaryCompactorPromptV2: DualPromptTemplate = {
  agentRole: "summary_compactor",
  version: "arc_v2",
  build: (input) => {
    const genreFamily = input.genreFamily as string | undefined;
    const isCultivation = genreFamily === "cultivation";
    const breakthroughHint = isCultivation
      ? "- mọi đột phá / chuyển biến quan hệ chính (nếu có)"
      : "- mọi chuyển biến quan hệ chính / bước ngoặt nhân vật (nếu có)";

    return {
      system: `Bạn là biên tập tóm lược arc cho một tiểu thuyết dài tiếng Việt. Nhận tóm tắt arc hiện tại (nếu có) và tóm tắt các chương MỚI, viết LẠI một bản tóm tắt arc hợp nhất dài tối đa 1200 từ tiếng Việt, giữ:
- mọi sự kiện có liên quan đến seeds/locked facts
${breakthroughHint}
- diễn biến chính đã xảy ra (không tiên đoán tương lai)
- KHÔNG bỏ sót sự kiện đã có trong tóm tắt arc hiện tại
Bỏ mô tả cảnh, chi tiết miêu tả nhỏ, dialog không quan trọng. Trả về plain text duy nhất, không markdown.`,
      user: [
        `Arc: ${String(input.arcTitle)}`,
        typeof input.previousRollingSummary === "string" && input.previousRollingSummary.trim()
          ? `# TÓM TẮT ARC HIỆN TẠI (hợp nhất, không bỏ sót)\n${input.previousRollingSummary}`
          : "",
        Array.isArray(input.perChapterSummaries)
          ? (input.perChapterSummaries as { chapterNumber: number; summary: string }[])
              .map((c) => `Ch ${c.chapterNumber}: ${c.summary}`)
              .join("\n\n")
          : "",
      ].filter(Boolean).join("\n\n"),
    };
  },
};

registerPrompt(arcSummaryCompactorPromptV2);
