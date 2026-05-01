import type { GenreDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface WriterV2PromptInput {
  serializedContext: string;
  genreDef: GenreDef;
}

export const writerPromptV2: DualPromptTemplate = {
  agentRole: 'writer',
  version: 'v2',
  build: (input) => {
    const { serializedContext, genreDef } = input as unknown as WriterV2PromptInput;
    return {
      system: `Bạn là tác giả tiểu thuyết ${genreDef.viLabel} tiếng Việt. Tuân BIBLE, GENRE CONTRACT, PROTAGONIST PERSONALITY CONTRACT, STORY OPTIONS, STYLE GUIDE, POWER SYSTEM tuyệt đối. Viết ~2000-3000 từ. Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung>`,
      user: serializedContext,
    };
  },
};

registerPrompt(writerPromptV2);
