import type { LLMProvider } from "../../providers/types.ts";

export interface StructurePlan {
  openingBeat: string;
  midpointBeat: string;
  climaxBeat: string;
  endingBeat: string;
  framework: string[];
}

export class SlotStructureAgent {
  constructor(private readonly deps: { provider: LLMProvider; model?: string }) {}

  async plan(input: { serializedContext: string; chapterNumber: number }): Promise<StructurePlan> {
    void this.deps;
    void input.serializedContext;
    return {
      openingBeat: `Chương ${input.chapterNumber} mở bằng tình huống phù hợp mục tiêu trong packet.`,
      midpointBeat: "Giữa chương đào sâu lựa chọn, quan hệ, đời sống hoặc áp lực chính tùy chapterPurpose.",
      climaxBeat: "Điểm nhấn của chương giải quyết hoặc làm rõ conflict ở đúng quy mô packet.",
      endingBeat: "Kết theo endingMode trong packet; chỉ dùng cliffhanger khi packet có optional hook rõ ràng.",
      framework: [
        "[DESCRIPTION_SLOT_1]",
        "[ACTION_SLOT_1]",
        "[DIALOGUE_SLOT_1]",
        "[ACTION_SLOT_2]",
        "[DIALOGUE_SLOT_2]",
        "[DESCRIPTION_SLOT_2]",
      ],
    };
  }
}
