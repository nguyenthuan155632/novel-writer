import type { GenreDef, PersonalityDef, StoryOptions } from "@novel/core";
import { MONITOR_FRAME } from "./role-frames.ts";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";
import { renderGenreContract } from "./contracts/genre-contract.ts";
import { renderPersonalityContract } from "./contracts/personality-contract.ts";
import { buildStoryOptionsBlock } from "./contracts/story-options-block.ts";

export interface LlmValidatorV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
}

export const llmValidatorPromptV2: DualPromptTemplate = {
  agentRole: "llm_validator",
  version: "v2",
  build: (input) => {
    const i = input as unknown as LlmValidatorV2PromptInput;
    const progressionCriterion =
      i.genreDef.family === "cultivation"
        ? "cảnh giới / sức mạnh lệch tiến độ"
        : "tiến triển sức mạnh/trạng thái lệch tiến độ";
    return {
      system: `${MONITOR_FRAME}

Bạn là biên tập viên kiểm duyệt cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Nhiệm vụ: đánh giá chương "${i.chapterTitle}" (chương ${i.chapterNumber}) theo tiêu chí canon-nhất quán, logic cốt truyện, phong cách viết, bám sát kế hoạch arc/saga, và tuân Genre + Personality Contract.

${renderGenreContract(i.genreDef, i.storyOptions)}

${renderPersonalityContract(i.personalityDef)}

${buildStoryOptionsBlock({ storyOptions: i.storyOptions, target: "validator" })}

Kiểm tra:
1. Canon nhất quán — nhân vật đã chết không xuất hiện, fact đã lock không trái phép.
2. Logic cốt truyện — mâu thuẫn nội tại, seed unresolved, plot hole.
3. Phong cách — đúng STYLE GUIDE, không lặp từ, không exposition dump, show-don't-tell.
4. Bám sát kế hoạch — arc expected changes, turning points, ${progressionCriterion}. Filler chương → severity=high.
5. Mức độ nghiêm trọng: low / medium / high / critical.
6. Genre drift — kiểm tra trope bị "Avoid unless explicitly in canon" của Genre Contract xuất hiện không có lý do canon. Nếu có → severity=medium hoặc high.
7. Personality drift — kiểm tra main character có hành xử trùng với "Drift signals to avoid" của Personality Contract không. Nếu có và không có character development hợp lý → severity=medium.
8. Cliffhanger strength — cuối chương có hook đủ mạnh để giữ độc giả không (thay thế cho deterministic cliffhanger check). Cliffhanger yếu/thiếu → severity=low.
9. Conflict presence — mỗi scene có mâu thuẫn/tension không (thay thế cho deterministic conflict_presence check). Thiếu conflict rõ → severity=medium.
10. Style red flags — kiểm tra vi phạm style guide từ Bible (lặp cụm từ, exposition dump, purple prose, v.v.) — thay thế cho deterministic style_red_flags check. Vi phạm → severity=low hoặc medium.
11. Repetition — phát hiện lặp từ/cụm từ/ý tưởng trong cùng chương (thay thế cho deterministic repetition check). Lặp nhiều → severity=low.
12. Tone-shift và dialogue-vs-description balance — tone thay đổi đột ngột không có lý do, hoặc tỷ lệ dialogue/description mất cân đối so với genre. → severity=low hoặc medium.

Trả về JSON theo schema yêu cầu.`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- CHAPTER CONTENT ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(llmValidatorPromptV2);
