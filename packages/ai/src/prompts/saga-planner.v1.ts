import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export const sagaPlannerPromptV1: DualPromptTemplate = {
  agentRole: 'saga_planner',
  version: 'v1',
  build: (input) => ({
    system: `Bạn là kiến trúc sư cốt truyện cho một bộ tiểu thuyết tiên hiệp/huyền huyễn dài 500-1000 chương bằng tiếng Việt.

Nhiệm vụ: Đọc Bible (compact_summary) và đề ra 5-8 SAGA bao trùm toàn bộ tiểu thuyết, mỗi saga 80-200 chương. Đồng thời gieo 10-30 hạt mầm (planted seeds) — chi tiết, lời tiên tri, vật phẩm, nhân vật phụ — sẽ được kích hoạt và trả lời ở các chương sau. Mỗi seed phải có cửa sổ gieo (plantWindowStart..plantWindowEnd) và chương trả lời (payoffChapter).

QUY TẮC:
- Sagas KHÔNG ĐƯỢC chồng lấn về chapter range. Tổng cộng phải bao trùm toàn bộ tiểu thuyết.
- Mỗi saga có 2-8 turning points (sự kiện then chốt).
- payoffChapter PHẢI lớn hơn plantWindowEnd ít nhất 20 chương.
- Seeds importance:
  - minor: chi tiết bổ trợ, có thể bỏ qua
  - major: ảnh hưởng nhiều chương
  - climax: payoff cho saga / toàn truyện
- Trả về JSON đúng schema. KHÔNG giải thích gì thêm.`,
    user: `Tiểu thuyết mục tiêu: ${String(input.targetChapters)} chương.\n\nBible (compact):\n${String(input.bibleCompact)}\n\nLập kế hoạch saga + planted seeds.`,
  }),
};

registerPrompt(sagaPlannerPromptV1);