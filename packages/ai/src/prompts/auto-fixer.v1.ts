import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface AutoFixerPromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
}

export const autoFixerPromptV1: DualPromptTemplate = {
  agentRole: 'auto_fixer',
  version: 'v1',
  build: (input) => {
    const { serializedContext, chapterContent, chapterTitle, chapterNumber, issues } = input as unknown as AutoFixerPromptInput;
    const issueList = issues.map((i, idx) => `${idx + 1}. [${i.severity}] ${i.code}: ${i.message}`).join('\n');
    return {
      system: `Bạn là biên tập viên sửa chữa cho tiểu thuyết tiên hiệp/huyền huyễn tiếng Việt.
Nhiệm vụ: sửa chương "${chapterTitle}" (chương ${chapterNumber}) dựa trên các vấn đề được chỉ ra.
Tuân BIBLE, STYLE GUIDE, POWER RULES tuyệt đối. Giữ nguyên câu chuyện, chỉ sửa các vấn đề.
Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung đã sửa>`,
      user: `--- CANON CONTEXT ---\n${serializedContext}\n\n--- VẤN ĐỀ CẦN SỬA ---\n${issueList}\n\n--- NỘI DUNG GỐC ---\n${chapterContent}`,
    };
  },
};

registerPrompt(autoFixerPromptV1);