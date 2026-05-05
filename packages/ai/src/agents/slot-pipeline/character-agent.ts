import type { LLMProvider } from "../../providers/types.ts";

export interface CharacterPlan {
  character: string;
  role: string;
  dialogueSlot: string;
  line: string;
}

export class SlotCharacterAgent {
  constructor(private readonly deps: { provider: LLMProvider; model?: string }) {}

  async plan(input: { charactersPresent: string[] }): Promise<CharacterPlan[]> {
    void this.deps;
    return input.charactersPresent.map((character, index) => ({
      character,
      role: index === 0 ? "Trục hành động chính" : "Phản chiếu hoặc gây áp lực lên trục chính",
      dialogueSlot: `[DIALOGUE_SLOT_${index + 1}]`,
      line: `${character} bộc lộ lựa chọn ngay tại điểm áp lực của cảnh.`,
    }));
  }
}
