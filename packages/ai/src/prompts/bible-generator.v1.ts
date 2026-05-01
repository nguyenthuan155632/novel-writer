import { registerPrompt, type PromptTemplate } from "./registry.ts";

export interface BibleGeneratorInput {
  premise: string;
  genre: string;
  tone: string | null;
  target_chapter_count: number;
}

const TEMPLATE = (
  i: BibleGeneratorInput,
): string => `Bạn là một editor / world-builder cho tiểu thuyết tiên hiệp / huyền huyễn.

Nhiệm vụ: tạo Story Bible cho một truyện mới. Đây là tài liệu nền — sẽ KHÔNG bao giờ được phép thay đổi sau khi đã chốt. Mọi chương sau này phải tuân theo.

Premise (ý tưởng người dùng):
${i.premise}

Genre: ${i.genre}
Tone: ${i.tone ?? "(không chỉ định, do bạn đề xuất)"}
Mục tiêu độ dài: ${i.target_chapter_count} chương

Yêu cầu output: JSON tuân theo schema bắt buộc, mỗi field là tiếng Việt (nội dung ghi dạng dễ đọc, có ngắt hàng):

- world_rules: luật thế giới, cảnh giới, không gian, lịch sử nền (≥ 200 từ)
- cultivation_system: hệ thống tu luyện chi tiết — cảnh giới, cách đột phá, vật phẩm, hạn chế (≥ 200 từ)
- bloodline_system: hệ thống huyết mạch — phân loại, nguồn gốc, cách kế thừa (≥ 200 từ)
- style_guide: phong cách viết (POV, mật độ tâm lý, từ vựng nên/không nên dùng) (≥ 100 từ)
- forbidden_rules: những gì TUYỆT ĐỐI không được phép xảy ra (≥ 5 quy tắc rõ ràng)
- ending_direction: định hướng kết truyện (không cần spoiler, chỉ đại ý) (≥ 100 từ)
- compact_summary: bản tóm tắt cô đọng cho hệ thống cache (≤ 1500 từ)

Ràng buộc:
- Tránh cliché "ding! hệ thống nâng cấp"
- Tránh harem mặc định
- Power phải có cost / risk / limitation
- Phong cách "show, don't tell" cinematic
- Giữ tính nhất quán nội bộ — không có rules mâu thuẫn

Trả lời JSON thuần, không markdown, không giải thích thêm.`;

export const bibleGeneratorPromptV1: PromptTemplate = {
  agentRole: "bible_generator",
  version: "v1",
  render: (input) => TEMPLATE(input as unknown as BibleGeneratorInput),
};

registerPrompt(bibleGeneratorPromptV1);
