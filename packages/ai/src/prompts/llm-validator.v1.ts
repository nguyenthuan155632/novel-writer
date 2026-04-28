import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface LlmValidatorPromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
}

export const llmValidatorPromptV1: DualPromptTemplate = {
  agentRole: 'llm_validator',
  version: 'v1',
  build: (input) => {
    const { serializedContext, chapterContent, chapterTitle, chapterNumber } = input as unknown as LlmValidatorPromptInput;
    return {
      system: `Bạn là biên tập viên kiểm duyệt cho tiểu thuyết tiên hiệp/huyền huyễn tiếng Việt.
Nhiệm vụ: đánh giá chương "${chapterTitle}" (chương ${chapterNumber}) theo tiêu chí canon-nhất quán, logic cốt truyện, phong cách viết.

Kiểm tra:
1. Canon nhất quán — nhân vật đã chết không xuất hiện, cảnh giới không nhảy vô lý, fact đã lock không trái phép
2. Logic cốt truyện — mâu thuẫn nội bộ, seed unresolved, plot hole
3. Phong cách — đúng STYLE GUIDE, không lặp từ, không exposition dump, show-don't-tell
4. Mức độ nghiêm trọng: low (nhỏ), medium (cần sửa), high (block), critical (block + regenerate)

Trả về JSON theo schema yêu cầu.`,
      user: `--- CANON CONTEXT ---\n${serializedContext}\n\n--- CHAPTER CONTENT ---\n${chapterContent}`,
    };
  },
};

registerPrompt(llmValidatorPromptV1);