import type { GenreDef } from "@novel/core";
import type { LLMProvider } from "../../providers/types.ts";
import { WriterAgent, type WriterResult } from "../writer.ts";
import type { StructurePlan } from "./structure-agent.ts";
import type { CharacterPlan } from "./character-agent.ts";
import type { ScenePlan } from "./scene-agent.ts";

export class SlotSynthesisAgent {
  constructor(private readonly deps: { provider: LLMProvider; model?: string }) {}

  async write(input: {
    serializedContext: string;
    cacheKey: string;
    chapterNumber: number;
    storyId: string;
    traceId: string;
    genreDef: GenreDef;
    structure: StructurePlan;
    characterPlans: CharacterPlan[];
    scenePlan: ScenePlan;
  }): Promise<WriterResult> {
    const writer = new WriterAgent({ provider: this.deps.provider, model: this.deps.model });
    const slotBlock = [
      "# SLOT PLAN",
      `Opening: ${input.structure.openingBeat}`,
      `Midpoint: ${input.structure.midpointBeat}`,
      `Climax: ${input.structure.climaxBeat}`,
      `Ending: ${input.structure.endingBeat}`,
      ...input.characterPlans.map((plan) => `Character: ${plan.character} => ${plan.role} @ ${plan.dialogueSlot}`),
      ...input.scenePlan.slots.map((slot) => `${slot}: ${input.scenePlan.filledSlots[slot] ?? "UNFILLED"}`),
    ].join("\n");

    return writer.write({
      serializedContext: `${input.serializedContext}\n\n${slotBlock}`,
      cacheKey: input.cacheKey,
      chapterNumber: input.chapterNumber,
      storyId: input.storyId,
      traceId: input.traceId,
      genreDef: input.genreDef,
    });
  }
}
