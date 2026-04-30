import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export const arcPlannerPromptV1: DualPromptTemplate = {
  agentRole: 'arc_planner',
  version: 'v1',
  build: (input) => {
    const sagaStart = Number(input.sagaStart) || 1;
    const sagaEnd = Number(input.sagaEnd) || 100;
    const sagaLength = Math.max(1, sagaEnd - sagaStart + 1);
    
    let arcCount = "2-5";
    let arcLength = "15-50";
    
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
      system: `Bạn là biên kịch cấp arc cho tiểu thuyết tiên hiệp/huyền huyễn. Chia nhỏ một SAGA thành ${arcCount} ARC, mỗi arc ${arcLength} chương.

YÊU CẦU:
- Tổng các arc PHẢI bao trùm toàn bộ chapter range của saga, không chồng lấn.
- Mỗi arc có 1-8 expectedChanges (sự kiện trạng thái cụ thể: A đột phá, B chết, item C lộ diện, v.v.).
- Nếu unresolved seeds nằm trong saga này, hãy ưu tiên gán payoff vào arc tương ứng (seedsToResolveInArc).
- Trả về JSON đúng schema. Không giải thích.`,
      user: `SAGA "${String(input.sagaTitle)}" (ch ${String(input.sagaStart)}-${String(input.sagaEnd)}):\n${String(input.sagaPremise)}\n\nTurning points:\n${Array.isArray(input.turningPoints) ? (input.turningPoints as string[]).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') : ''}\n\nTrạng thái hiện tại:\n${String(input.currentState)}\n\nSeeds chưa giải quyết:\n${Array.isArray(input.unresolvedSeeds) ? (input.unresolvedSeeds as {seedKey: string; description: string; payoffChapter: number}[]).map((s) => `- ${s.seedKey} (payoff ch ${s.payoffChapter}): ${s.description}`).join('\n') : '(none)'}`,
    };
  },
};

registerPrompt(arcPlannerPromptV1);