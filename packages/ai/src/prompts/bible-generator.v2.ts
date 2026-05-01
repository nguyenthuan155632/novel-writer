import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { registerPrompt, type PromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export interface BibleGeneratorV2Input {
  premise: string;
  target_chapter_count: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
}

const TEMPLATE = (i: BibleGeneratorV2Input): string => {
  const genreContract = renderGenreContract(i.genreDef, i.storyOptions);
  const personalityContract = renderPersonalityContract(i.personalityDef);
  const storyOptionsBlock = renderStoryOptionsBlock(i.storyOptions);

  return `Bạn là editor / world-builder cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Tuân thủ Genre Contract và Personality Contract bên dưới như ràng buộc bắt buộc.

${genreContract}

${personalityContract}

${storyOptionsBlock}

Premise (ý tưởng người dùng):
${i.premise}

Mục tiêu độ dài: ${i.target_chapter_count} chương

Yêu cầu output: JSON tuân theo schema bắt buộc, mỗi field tiếng Việt:
- world_rules (≥ 200 từ): luật thế giới, không gian, lịch sử nền, phù hợp genre.
- power_system (≥ 200 từ): hệ thống sức mạnh chính của thế giới — phải phù hợp power_system_kind.
- power_system_kind: một trong cultivation | martial | ability | tech | urban | historical | horror | mystery | system | reincarnation | mixed | none. Chọn theo genre family.
- cultivation_system (CHỈ điền nếu power_system_kind='cultivation', ≥ 200 từ): cảnh giới, đột phá, vật phẩm, hạn chế.
- bloodline_system (CHỈ điền nếu genre dùng huyết mạch, ≥ 200 từ): phân loại, nguồn gốc, kế thừa.
- style_guide (≥ 100 từ): phong cách viết, POV theo storyOptions, từ vựng nên/không nên.
- forbidden_rules (≥ 5 quy tắc): những gì TUYỆT ĐỐI không được. Phải bao gồm tất cả discouragedTropes của genre đã liệt kê ở Genre Contract.
- ending_direction (≥ 100 từ).
- compact_summary (≤ 1500 từ).

Ràng buộc:
- KHÔNG đưa trope ngoài genre vào (xem "Avoid unless explicitly in canon").
- Power phải có cost / risk / limitation.
- Phong cách "show, don't tell" cinematic.
- Giữ tính nhất quán nội bộ — không có rules mâu thuẫn.

Trả lời JSON thuần, không markdown, không giải thích thêm.`;
};

export const bibleGeneratorPromptV2: PromptTemplate = {
  agentRole: 'bible_generator',
  version: 'v2',
  render: (input) => TEMPLATE(input as unknown as BibleGeneratorV2Input),
};

registerPrompt(bibleGeneratorPromptV2);
