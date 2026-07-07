import type { LLMProvider } from "../../providers/types.ts";
import type { StructurePlan } from "./structure-agent.ts";
import type { CharacterPlan } from "./character-agent.ts";

export interface ScenePlan {
  slots: string[];
  filledSlots: Record<string, string>;
}

export class SlotSceneAgent {
  constructor(private readonly deps: { provider: LLMProvider; model?: string }) {}

  async plan(input: { structure: StructurePlan; characterPlans: CharacterPlan[]; conflict: string; requiredEvents: string[]; cliffhanger: string; endingMode?: string }): Promise<ScenePlan> {
    void this.deps;
    const ending = input.cliffhanger
      ? `Kết bằng optional hook: ${input.cliffhanger}`
      : `Kết theo endingMode "${input.endingMode ?? "quiet_transition"}", không tự thêm cliffhanger.`;
    const filledSlots: Record<string, string> = {
      "[DESCRIPTION_SLOT_1]": `Bối cảnh mở ra conflict ở đúng quy mô chương: ${input.conflict}`,
      "[ACTION_SLOT_1]": `Nhịp mở triển khai sự kiện đầu tiên: ${input.requiredEvents[0] ?? input.conflict}`,
      "[ACTION_SLOT_2]": `Điểm nhấn xoay quanh ${input.requiredEvents.slice(1).join(", ") || input.conflict}`,
      "[DESCRIPTION_SLOT_2]": ending,
    };
    for (const plan of input.characterPlans) {
      filledSlots[plan.dialogueSlot] = `${plan.character}: ${plan.line}`;
    }
    return {
      slots: input.structure.framework,
      filledSlots,
    };
  }
}
