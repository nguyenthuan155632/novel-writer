import { describe, expect, it } from "vitest";
import { MockProvider } from "../../src/providers/mock.ts";
import { SlotStructureAgent } from "../../src/agents/slot-pipeline/structure-agent.ts";
import { SlotCharacterAgent } from "../../src/agents/slot-pipeline/character-agent.ts";
import { SlotSceneAgent } from "../../src/agents/slot-pipeline/scene-agent.ts";
import { SlotSynthesisAgent } from "../../src/agents/slot-pipeline/synthesis-agent.ts";

describe("slot pipeline", () => {
  it("keeps basic slot coherence across structure, characters, and scene plan", async () => {
    const provider = new MockProvider({
      responder: { kind: "fixed", content: "TITLE: Đỉnh Núi\n\nLam Trạch chạm ngưỡng đột phá trước khi Mộc Thanh kéo hắn vào trận chiến." },
    });
    const structureAgent = new SlotStructureAgent({ provider });
    const characterAgent = new SlotCharacterAgent({ provider });
    const sceneAgent = new SlotSceneAgent({ provider });
    const synthesisAgent = new SlotSynthesisAgent({ provider });

    const structure = await structureAgent.plan({ serializedContext: "ctx", chapterNumber: 12 });
    const characterPlans = await characterAgent.plan({ charactersPresent: ["Lam Trạch", "Mộc Thanh"] });
    const scenePlan = await sceneAgent.plan({
      structure,
      characterPlans,
      conflict: "Bị dồn vào trận địa trên đỉnh núi",
      requiredEvents: ["Lam Trạch đột phá cảnh giới", "Mộc Thanh cứu viện"],
      cliffhanger: "Kẻ đứng sau lộ diện",
    });
    const result = await synthesisAgent.write({
      serializedContext: "ctx",
      cacheKey: "hot-hash",
      chapterNumber: 12,
      storyId: "story-1",
      traceId: "trace-1",
      genreDef: { slug: "tien_hiep", viLabel: "Tiên hiệp", viDescription: "", family: "cultivation", allowedTropes: [], discouragedTropes: [], toneGuidance: "", worldbuildingGuidance: "", examplePremises: [] } as any,
      structure,
      characterPlans,
      scenePlan,
    });

    expect(structure.framework).toContain("[DIALOGUE_SLOT_1]");
    expect(scenePlan.filledSlots["[ACTION_SLOT_1]"]).toContain("Lam Trạch đột phá cảnh giới");
    expect(scenePlan.filledSlots["[DIALOGUE_SLOT_2]"]).toContain("Mộc Thanh");
    expect(result.title).toBe("Đỉnh Núi");
    expect(result.content).toContain("Lam Trạch");
  });
});
