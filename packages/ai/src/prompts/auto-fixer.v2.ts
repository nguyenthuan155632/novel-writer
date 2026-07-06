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
Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung đã sửa>\n\nQUY TẮC BẮT BUỘC:\n- TUYỆT ĐỐI KHÔNG viết tắt tên nhân vật (ví dụ: cấm "LTS", "TCT", "NH" thay vì tên đầy đủ). Luôn dùng tên đầy đủ hoặc danh xưng (hắn, nàng, lão, v.v.).
- Nếu vấn đề là forbidden_move hoặc xưng hô hiện đại, phải thay toàn bộ "tôi/anh/em/cậu/mày/tao" và từ hiện đại bị nêu bằng xưng hô hợp bối cảnh như "ta/ngươi/hắn/nàng/lão" mà vẫn giữ nghĩa cảnh.
- Với thuật ngữ hiện đại về dịch vụ/thương mại/du lịch/văn phòng/viết tắt hiện đại như CLB, KHÔNG thay bằng từ đồng nghĩa hiện đại khác như "miễn phí/không thu phí"; hãy xóa mệnh đề đó hoặc viết lại bằng hình ảnh dị giới/cổ phong.
- Nếu vấn đề là word_count_target và chương đang dưới mục tiêu, phải mở rộng chương lên ít nhất 2200 từ bằng cảnh nối tiếp, cảm giác, phản ứng nhân vật, xung đột nhỏ, hậu quả của sự kiện, và chi tiết hành động hợp canon; không chỉ thêm vài câu tóm tắt.
- Nếu vấn đề là word_count_target và chương đang vượt mục tiêu, phải nén còn 2200-2600 từ, cắt lặp ý và câu chuyển cảnh dư.`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- VẤN ĐỀ CẦN SỬA ---\n${issueList}\n\n--- NỘI DUNG GỐC ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(autoFixerPromptV2);
