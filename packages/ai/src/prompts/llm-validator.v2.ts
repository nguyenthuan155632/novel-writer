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
4. Bám sát kế hoạch — arc expected changes, turning points, ${progressionCriterion}. Chương chậm nhịp KHÔNG phải lỗi nếu có giá trị đọc rõ: đời sống, quan hệ, hậu quả, chuẩn bị, khám phá thế giới, hoặc nội tâm.
5. Mức độ nghiêm trọng: low / medium / high / critical.
6. Genre drift — kiểm tra trope bị "Avoid unless explicitly in canon" của Genre Contract xuất hiện không có lý do canon. Nếu có → severity=medium hoặc high.
7. Personality drift — kiểm tra main character có hành xử trùng với "Drift signals to avoid" của Personality Contract không. Nếu có và không có character development hợp lý → severity=medium.
8. Ending fit — kiểu kết chương có hợp chapterPurpose/endingMode và mạch truyện không. Không bắt buộc cliffhanger; chỉ cảnh báo nếu kết cụt, lạc mạch, hoặc hứa hẹn giả. Với endingMode resolved/quiet_transition/emotional_aftertaste/comic_beat, coi các câu người kể hứa mơ hồ về tai họa/bí mật tương lai kiểu "một ngày nào đó..." hoặc "hắn chưa biết rằng..." là pacing_ending_mismatch severity=low/medium.
9. Scene purpose — mỗi scene có chức năng đọc được không: đời sống, quan hệ, chuẩn bị, khám phá, nội tâm, bí ẩn, hành động, hoặc chuyển trạng thái. Không coi slice-of-life là filler.
10. Style red flags — kiểm tra vi phạm style guide từ Bible (lặp cụm từ, exposition dump, purple prose, v.v.) — thay thế cho deterministic style_red_flags check. Vi phạm → severity=low hoặc medium.
11. Repetition — phát hiện lặp từ/cụm từ/ý tưởng trong cùng chương (thay thế cho deterministic repetition check). Lặp nhiều → severity=low.
12. Tone-shift và dialogue-vs-description balance — tone thay đổi đột ngột không có lý do, hoặc tỷ lệ dialogue/description mất cân đối so với genre. → severity=low hoặc medium.

Dưới đây là các mã lỗi chuẩn và message tiếng Việt ASCII — dùng khi trả về JSON:
- genre_drift_modern_trope: "Trope hien dai khong phu hop the gioi"
- pacing_description_slot_empty: "Slot mo ta trong, thieu chi tiet"
- pacing_action_slot_empty: "Slot hanh dong trong, thieu canh"
- pacing_dialogue_slot_empty: "Slot hoi thoai trong, thieu thoai"
- pacing_ending_mismatch: "Ket chuong khong hop muc dich chuong"
- pacing_scene_purpose_missing: "Canh thieu chuc nang ke chuyen"
- protagonist_personality_drift: "Nhan vat chinh drift tinh cach"
- antagonist_personality_drift: "Phan dien drift tinh cach"
- story_option_comedy_stakes: "Can bang hai kich-stakes chua dung"
- stakes_too_low: "Stakes qua thap, thieu canh thang"
- canon_character_appearance: "Nhan vat xuat hien khong hop le"
- style_prose_overloaded: "Prose qua tai, can rut gon"
- style_purple_prose: "Purple prose, viet qua cau ky"
- style_repetition: "Lap tu/cum tu trong chuong"
- style_exposition_dump: "Exposition dump, don thong tin qua nhieu"
- content_slot_unfilled: "Slot noi dung chua duoc dien"

Trả về JSON theo schema yêu cầu. Tất cả code và message PHẢI là tiếng Việt ASCII. Không trả về tiếng Anh.`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- CHAPTER CONTENT ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(llmValidatorPromptV2);
