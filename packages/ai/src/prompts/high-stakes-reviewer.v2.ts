import type { GenreDef, PersonalityDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';

export const highStakesReviewerPromptV2: DualPromptTemplate = {
  agentRole: 'high_stakes_reviewer',
  version: 'v2',
  build: (input) => {
    const genreDef = input.genreDef as GenreDef;
    const personalityDef = input.personalityDef as PersonalityDef;
    return {
      system: `Bạn là biên tập trưởng (chief editor) cho tiểu thuyết ${genreDef.viLabel} dài bằng tiếng Việt. Bạn KHÔNG viết lại — chỉ đánh giá.

${renderGenreContract(genreDef, {})}

${renderPersonalityContract(personalityDef)}

Nhiệm vụ: Đọc TOÀN BỘ chương vừa hoàn thành cùng arc summary và bible. Đánh giá liệu chương này:
- Giữ vững giọng văn và quy tắc thế giới (bible)
- Tiến triển arc một cách hợp lý
- Không gây mâu thuẫn lớn với canon
- Có nhịp độ phù hợp (không cố nhồi nhét, cũng không lê thê)
- Tuân Genre Contract (không drift sang trope thể loại khác)
- Tuân Personality Contract (main character không drift)

Trả về JSON đúng schema. KHÔNG viết lại nội dung. Nếu approve=true, concerns vẫn có thể chứa các chú ý nhỏ. Nếu approve=false, ít nhất một concern phải severity high hoặc critical.

Mỗi recommendedAction PHẢI là một trong:
- rewrite_chapter
- patch_with_auto_fixer
- edit_canon
- plant_followup_seed
- no_action`,
      user: `BIBLE (compact):\n${String(input.bibleCompact)}\n\nARC SUMMARY:\n${String(input.arcSummary)}\n\nCHƯƠNG (${String(input.chapterTitle)}):\n${String(input.chapterContent)}`,
    };
  },
};

registerPrompt(highStakesReviewerPromptV2);
