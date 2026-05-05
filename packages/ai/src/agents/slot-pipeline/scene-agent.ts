import type { LLMProvider } from "../../providers/types.ts";
import type { StructurePlan } from "./structure-agent.ts";
import type { CharacterPlan } from "./character-agent.ts";

export interface ScenePlan {
  slots: string[];
  filledSlots: Record<string, string>;
}

export class SlotSceneAgent {
  constructor(private readonly deps: { provider: LLMProvider; model?: string }) {}

  async plan(input: { structure: StructurePlan; characterPlans: CharacterPlan[]; conflict: string; requiredEvents: string[]; cliffhanger: string }): Promise<ScenePlan> {
    void this.deps;
    const filledSlots: Record<string, string> = {
      "[DESCRIPTION_SLOT_1]": `Bối cảnh mở ra cùng áp lực: ${input.conflict}`,
      "[ACTION_SLOT_1]": `Biến cố mở màn buộc nhân vật lao vào xung đột: ${input.requiredEvents[0] ?? input.conflict}`,
      "[ACTION_SLOT_2]": `Cao trào xoay quanh ${input.requiredEvents.slice(1).join(", ") || input.conflict}`,
      "[DESCRIPTION_SLOT_2]": `Điểm kết dồn tới cliffhanger: ${input.cliffhanger}`,
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
