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
      openingBeat: `Chương ${input.chapterNumber} mở bằng mục tiêu trực diện từ packet.`,
      midpointBeat: "Giữa chương tăng áp lực và khóa lựa chọn của nhân vật chính.",
      climaxBeat: "Cao trào giải quyết xung đột chính hoặc bẻ hướng tình thế.",
      endingBeat: "Kết bằng cliffhanger đúng packet, giữ đà sang chương sau.",
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
