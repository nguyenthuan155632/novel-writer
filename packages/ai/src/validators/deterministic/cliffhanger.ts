import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

export const cliffhangerCheck: DeterministicCheck = {
  id: "cliffhanger",
  severity: "low",
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content.trim();
    // Remove trailing scene break markers (*** or ---)
    const cleaned = content.replace(/[\n\r]+(\*{3,}|-{3,})\s*$/, "").trim();
    const paragraphs = cleaned
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);
    const lastParagraph = paragraphs.pop() ?? "";
    // Split on sentence-ending punctuation, keep fragments > 5 chars
    const sentences = lastParagraph
      .split(/(?<=[.!?。！？""])\s*/)
      .filter((s) => s.trim().length > 5);
    const lastSentence = sentences.pop() ?? "";

    const cliffhangerIndicators = [
      "nhưng",
      "thì",
      "đột nhiên",
      "bỗng nhiên",
      "vừa rồi",
      "chưa kịp",
      "phía trước",
      "bóng hình",
      "giọng nói",
      "tiếng",
      "ánh mắt",
      "thấy",
      "nhận ra",
      "...",
      "…",
      "có lẽ",
      "không ngờ",
      "không…",
      "rốt cuộc",
    ];

    // A sentence ending with ellipsis or question mark is a natural cliffhanger
    if (/(?:\?|…|\.{3})\s*["\u201d]?\s*$/.test(lastSentence)) {
      return { pass: true, issues: [] };
    }

    const hasCliffhanger = cliffhangerIndicators.some((ind) =>
      lastParagraph.toLowerCase().includes(ind),
    );
    const isFinalChapter =
      input.chapter.chapterNumber >=
      (input.context.warm.arcPlantedSeeds.find((s) => s.payoffChapter)
        ?.payoffChapter ?? 999);
    if (!hasCliffhanger && !isFinalChapter) {
      issues.push("Chương thiếu cliffhanger — câu cuối không tạo sự tò mò.");
    }

    return { pass: issues.length === 0, issues };
  },
};
