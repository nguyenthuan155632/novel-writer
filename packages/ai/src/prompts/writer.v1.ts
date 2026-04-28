import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface WriterPromptInput {
  serializedContext: string;
}

export const writerPromptV1: DualPromptTemplate = {
  agentRole: 'writer',
  version: 'v1',
  build: (input) => {
    const { serializedContext } = input as unknown as WriterPromptInput;
    return {
      system: `Bạn là tác giả tiểu thuyết tiên hiệp/huyền huyễn tiếng Việt. Tuân BIBLE, STYLE GUIDE, POWER RULES tuyệt đối. Viết ~2000-3000 từ. Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung>`,
      user: serializedContext,
    };
  },
};

registerPrompt(writerPromptV1);