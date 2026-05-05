import type { GenreDef } from "@novel/core";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";

export interface PolishPassV1PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  genreDef: GenreDef;
  hints: string[];
}

export const polishPassPromptV1: DualPromptTemplate = {
  agentRole: "polish_pass",
  version: "v1",
  build: (input) => {
    const i = input as unknown as PolishPassV1PromptInput;
    const hintBlock =
      i.hints.length > 0
        ? i.hints.map((hint, index) => `${index + 1}. ${hint}`).join("\n")
        : "1. Không có anti-pattern cụ thể; chỉ làm mượt câu chữ, nhịp, nhạc tính.";
    return {
      system: `Bạn là biên tập viên đánh bóng văn phong cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Nhiệm vụ: polish chương "${i.chapterTitle}" (chương ${i.chapterNumber}) sau khi chương đã pass validator.
Chỉ sửa mức cosmetic: nhịp câu, lặp từ, anti-LLM phrase, chuyển cảnh gượng, nhạc tính câu văn. KHÔNG đổi plot, canon, outcome, beat chính, POV, personality, power logic.
Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung đã polish>`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- POLISH HINTS ---\n${hintBlock}\n\n--- CHAPTER CONTENT ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(polishPassPromptV1);
