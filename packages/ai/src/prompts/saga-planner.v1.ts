import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export const sagaPlannerPromptV1: DualPromptTemplate = {
  agentRole: 'saga_planner',
  version: 'v1',
  build: (input) => {
    const targetChapters = Number(input.targetChapters) || 1000;
    
    let sagaCount = "5-8";
    let sagaLength = "80-200";
    let seedCount = "10-30";
    let seedDistance = "20";
    
    if (targetChapters < 50) {
      // Truyện cực ngắn (e.g., 20 chương)
      sagaCount = "1-2";
      sagaLength = "10-30";
      seedCount = "3-8";
      seedDistance = "3";
    } else if (targetChapters < 200) {
      // Truyện ngắn / vừa (e.g., 100 chương)
      sagaCount = "2-4";
      sagaLength = "25-60";
      seedCount = "5-15";
      seedDistance = "10";
    } else if (targetChapters < 1500) {
      // Truyện tiêu chuẩn (e.g., 500 - 1000 chương)
      sagaCount = "5-10";
      sagaLength = "80-200";
      seedCount = "10-30";
      seedDistance = "20";
    } else {
      // Truyện cực dài (e.g., 2000 chương)
      sagaCount = "10-15";
      sagaLength = "150-300";
      seedCount = "20-50";
      seedDistance = "40";
    }

    return {
      system: `Bạn là kiến trúc sư cốt truyện cho một bộ tiểu thuyết tiên hiệp/huyền huyễn dài khoảng ${targetChapters} chương bằng tiếng Việt.

Nhiệm vụ: Đọc Bible (compact_summary) và đề ra ${sagaCount} SAGA bao trùm toàn bộ tiểu thuyết, mỗi saga ${sagaLength} chương. Đồng thời gieo ${seedCount} hạt mầm (planted seeds) — chi tiết, lời tiên tri, vật phẩm, nhân vật phụ — sẽ được kích hoạt và trả lời ở các chương sau. Mỗi seed phải có cửa sổ gieo (plantWindowStart..plantWindowEnd) và chương trả lời (payoffChapter).

QUY TẮC:
- Sagas KHÔNG ĐƯỢC chồng lấn về chapter range. Tổng cộng phải bao trùm toàn bộ tiểu thuyết.
- Mỗi saga có 2-8 turning points (sự kiện then chốt).
- payoffChapter PHẢI lớn hơn plantWindowEnd ít nhất ${seedDistance} chương.
- Seeds importance:
  - minor: chi tiết bổ trợ, có thể bỏ qua
  - major: ảnh hưởng nhiều chương
  - climax: payoff cho saga / toàn truyện
- Trả về JSON đúng schema. KHÔNG giải thích gì thêm.`,
      user: `Tiểu thuyết mục tiêu: ${targetChapters} chương.\n\nBible (compact):\n${String(input.bibleCompact)}\n\nLập kế hoạch saga + planted seeds.`,
    };
  },
};

registerPrompt(sagaPlannerPromptV1);