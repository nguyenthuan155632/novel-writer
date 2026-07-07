import type { GenreDef, StoryOptions } from "@novel/core";
import { PLANNER_FRAME } from "./role-frames.ts";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";
import { renderGenreContract } from "./contracts/genre-contract.ts";
import { buildStoryOptionsBlock } from "./contracts/story-options-block.ts";

export const sagaPlannerPromptV2: DualPromptTemplate = {
  agentRole: "saga_planner",
  version: "v2",
  build: (input) => {
    const targetChapters = Number(input.targetChapters) || 1000;
    const genreDef = input.genreDef as GenreDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;

    let sagaCount = "5-8",
      sagaLength = "80-200",
      seedCount = "10-30",
      seedDistance = "20";
    if (targetChapters < 50) {
      sagaCount = "1-2";
      sagaLength = "10-30";
      seedCount = "3-8";
      seedDistance = "3";
    } else if (targetChapters < 200) {
      sagaCount = "2-4";
      sagaLength = "25-60";
      seedCount = "5-15";
      seedDistance = "10";
    } else if (targetChapters < 1500) {
      sagaCount = "5-10";
      sagaLength = "80-200";
      seedCount = "10-30";
      seedDistance = "20";
    } else {
      sagaCount = "10-15";
      sagaLength = "150-300";
      seedCount = "20-50";
      seedDistance = "40";
    }

    return {
      system: `${PLANNER_FRAME}

Bạn là kiến trúc sư cốt truyện cho một bộ tiểu thuyết ${genreDef.viLabel} dài khoảng ${targetChapters} chương bằng tiếng Việt.

${renderGenreContract(genreDef, storyOptions)}

${buildStoryOptionsBlock({ storyOptions, target: "saga" })}

Nhiệm vụ: Đọc Bible (compact_summary) và đề ra ${sagaCount} SAGA bao trùm toàn bộ tiểu thuyết, mỗi saga ${sagaLength} chương. Đồng thờ
i gieo ${seedCount} hạt mầm (planted seeds) — chi tiết, lờ
i tiên tri, vật phẩm, nhân vật phụ — sẽ được kích hoạt và trả lờ
i ở các chương sau. Mỗi seed phải có cửa sổ gieo (plantWindowStart..plantWindowEnd) và chương trả lờ
i (payoffChapter).

QUY TẮC:
- Sagas KHÔNG ĐƯỢC chồng lấn về chapter range. Tổng cộng phải bao trùm toàn bộ tiểu thuyết.
- Mỗi saga có 2-8 turning points (sự kiện then chốt).
- payoffChapter PHẢI lớn hơn plantWindowEnd ít nhất ${seedDistance} chương.
- Seeds importance: minor (chi tiết bổ trợ), major (ảnh hưởng nhiều chương), climax (payoff cho saga / toàn truyện).
- Sagas và seeds PHẢI bám đúng Genre Contract — không tự ý đưa trope của thể loại khác.
- Đừng dồn seed vào các chương 1-5. Với tiểu thuyết dài tập, seed mở đầu nên rải qua toàn arc đầu; trong 3 chương đầu tối đa 1 seed quan trọng trừ khi premise bắt buộc.
- Seed mở đầu nên là chi tiết đời sống có hai lớp nghĩa (vật dụng, thói quen, lời nói, địa danh, nợ nần, nghề nghiệp, quan hệ xóm giềng), không phải chuỗi dấu hiệu bí ẩn ép nhân vật lập tức điều tra.
- Turning point đầu của saga có thể là vết nứt chậm trong đời sống đã được thiết lập. Tránh lập kế hoạch khiến chương đầu phải mở bằng biến cố lớn, truy đuổi, giao chiến hoặc nhiệm vụ điều tra.
- Nếu premise yêu cầu mở đầu bằng sinh hoạt thường ngày, phải tôn trọng điều đó: turning point đầu không được ghi rõ "(chương 1)" hoặc ép chương 1 chứa biến cố chính. Chương 1 có thể chỉ thiết lập nơi chốn, nghề nghiệp, quan hệ và một chi tiết lệch rất nhỏ.
- Trả về JSON đúng schema. KHÔNG giải thích gì thêm.`,
      user: `Tiểu thuyết mục tiêu: ${targetChapters} chương.\n\nBible (compact):\n${String(input.bibleCompact)}\n\nLập kế hoạch saga + planted seeds.`,
    };
  },
};

registerPrompt(sagaPlannerPromptV2);
