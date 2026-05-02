import { registerPrompt, type DualPromptTemplate } from "./registry.ts";

export type SummaryCompactorV2PromptInput = {
  chapterNumber: number;
  chapterContent: string;
  previousSummary: string;
  bibleCompact: string;
  genreFamily?: string;
};

export const summaryCompactorPromptV2: DualPromptTemplate = {
  agentRole: "summary_compactor",
  version: "v2",
  build: (input) => {
    const genreFamily = (input as unknown as SummaryCompactorV2PromptInput)
      .genreFamily;
    const isCultivation = genreFamily === "cultivation";
    const keyEventHint = isCultivation
      ? "ưu tiên conflict, đột phá, plot twist"
      : "ưu tiên conflict, plot twist, character development";

    return {
      system: `Bạn là summary-compactor cho một tiểu thuyết tiếng Việt. Tóm tắt chương vừa viết thành bản chi tiết (tối đa 2000 ký tự Unicode).
Quy tắc:
- Chỉ tóm tắt những gì THỰC SỰ xảy ra.
- keyEvents là sự kiện quan trọng nhất, ${keyEventHint}.
- charactersPresent là nhân vật CÓ MẶT trong chương.
- moodShift so với chương trước (nếu có).
- Trả JSON đúng schema.`,
      user: [
        `# CHƯƠNG ${String(input.chapterNumber)}`,
        input.chapterContent,
        "",
        `# TÓM TẮT CHƯƠNG TRƯỚC`,
        input.previousSummary,
        "",
        `# BIBLE (tham khảo)`,
        input.bibleCompact,
        "",
        `Tóm tắt chương. Trả JSON theo SummaryCompactorOutput schema.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

registerPrompt(summaryCompactorPromptV2);
