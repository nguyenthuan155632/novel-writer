import type { GenreDef, StoryOptions } from "@novel/core";
import { PLANNER_FRAME } from "./role-frames.ts";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";
import { renderGenreContract } from "./contracts/genre-contract.ts";
import { buildStoryOptionsBlock } from "./contracts/story-options-block.ts";

export const arcPlannerPromptV2: DualPromptTemplate = {
  agentRole: "arc_planner",
  version: "v2",
  build: (input) => {
    const sagaStart = Number(input.sagaStart) || 1;
    const sagaEnd = Number(input.sagaEnd) || 100;
    const sagaLength = Math.max(1, sagaEnd - sagaStart + 1);
    const genreDef = input.genreDef as GenreDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;

    let arcCount = "2-5",
      arcLength = "15-50";
    if (sagaLength < 20) {
      arcCount = "1-2";
      arcLength = "5-10";
    } else if (sagaLength < 50) {
      arcCount = "2-4";
      arcLength = "10-25";
    } else if (sagaLength > 150) {
      arcCount = "4-8";
      arcLength = "30-60";
    }

    return {
      system: `${PLANNER_FRAME}

Bạn là biên kịch cấp arc cho tiểu thuyết ${genreDef.viLabel} tiếng Việt. Chia nhỏ một SAGA thành ${arcCount} ARC, mỗi arc ${arcLength} chương.

${renderGenreContract(genreDef, storyOptions)}

${buildStoryOptionsBlock({ storyOptions, target: "arc" })}

YÊU CẦU:
- Tổng các arc PHẢI bao trùm toàn bộ chapter range của saga, không chồng lấn.
- Mỗi arc có 1-8 expectedChanges (sự kiện trạng thái cụ thể).
- TURNING POINTS: Mỗi arc PHẢI khai báo coveredTurningPoints (mảng index 0-based của turning point mà arc đó cover). Mỗi turning point chỉ thuộc đúng 1 arc. Tất cả turning points phải được phân bổ hết — không bỏ sót. Phân bổ cân đối: tối đa 2-3 TP/arc, tránh nhét quá nhiều TP vào 1 arc ngắn.
- Premise của mỗi arc PHẢI phản ánh rõ nội dung các turning points mà nó cover.
- Nếu unresolved seeds nằm trong saga này, hãy ưu tiên gán payoff vào arc tương ứng (seedsToResolveInArc).
- Bám đúng Genre Contract — không tự ý đưa trope của thể loại khác.
- Trả về JSON đúng schema. Không giải thích.`,
      user: `SAGA "${String(input.sagaTitle)}" (ch ${String(input.sagaStart)}-${String(input.sagaEnd)}):\n${String(input.sagaPremise)}\n\nTurning points:\n${Array.isArray(input.turningPoints) ? (input.turningPoints as string[]).map((t, i) => `${i}. ${t}`).join("\n") : ""}\n\nTrạng thái hiện tại:\n${String(input.currentState)}\n\nSeeds chưa giải quyết:\n${Array.isArray(input.unresolvedSeeds) ? (input.unresolvedSeeds as { seedKey: string; description: string; payoffChapter: number }[]).map((s) => `- ${s.seedKey} (payoff ch ${s.payoffChapter}): ${s.description}`).join("\n") : "(none)"}`,
    };
  },
};

registerPrompt(arcPlannerPromptV2);
