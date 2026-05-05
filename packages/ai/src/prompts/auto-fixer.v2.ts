import type { GenreDef, StoryOptions } from "@novel/core";
import { CREATOR_FRAME } from "./role-frames.ts";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";
import { buildStoryOptionsBlock } from "./contracts/story-options-block.ts";

export interface AutoFixerV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
  genreDef: GenreDef;
  storyOptions?: StoryOptions;
}

export const autoFixerPromptV2: DualPromptTemplate = {
  agentRole: "auto_fixer",
  version: "v2",
  build: (input) => {
    const i = input as unknown as AutoFixerV2PromptInput;
    const issueList = i.issues
      .map((x, idx) => `${idx + 1}. [${x.severity}] ${x.code}: ${x.message}`)
      .join("\n");
    return {
      system: `${CREATOR_FRAME}

Bạn là biên tập viên sửa chữa cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Nhiệm vụ: sửa chương "${i.chapterTitle}" (chương ${i.chapterNumber}) dựa trên các vấn đề được chỉ ra.
Tuân BIBLE, GENRE CONTRACT, PROTAGONIST PERSONALITY CONTRACT, STORY OPTIONS, STYLE GUIDE, POWER SYSTEM tuyệt đối. Giữ nguyên câu chuyện, chỉ sửa các vấn đề.${i.storyOptions ? "\n\n" + buildStoryOptionsBlock({ storyOptions: i.storyOptions, target: "writer" }) : ""}
Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung đã sửa>\n\nQUY TẮC BẮT BUỘC:\n- TUYỆT ĐỐI KHÔNG viết tắt tên nhân vật (ví dụ: cấm "LTS", "TCT", "NH" thay vì tên đầy đủ). Luôn dùng tên đầy đủ hoặc danh xưng (hắn, nàng, lão, v.v.).`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- VẤN ĐỀ CẦN SỬA ---\n${issueList}\n\n--- NỘI DUNG GỐC ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(autoFixerPromptV2);
