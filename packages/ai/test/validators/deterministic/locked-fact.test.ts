import { describe, it, expect } from "vitest";
import { lockedFactCheck } from "../../../src/validators/deterministic/locked-fact.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(
  content: string,
  lockedFacts: { topic: string; fact: string }[] = [],
): CheckInput {
  return {
    content,
    context: {
      hot: {
        systemRules: "",
        bibleCompact: "",
        styleGuide: "",
        powerSystem: "",
        powerSystemKind: "",
        genreContract: "",
        personalityContract: "",
        storyOptionsBlock: "",
        styleFewShots: [],
      },
      warm: {
        sagaSummary: "",
        arcSummary: "",
        activeCharacters: [],
        arcOpenThreads: [],
        arcPlantedSeeds: [],
      },
      cold: {
        recentSummaries: [],
        retrievedFacts: [],
        retrievedPastChapters: [],
        seedsToPlantNow: [],
        timelineEvents: [],
      pendingCanonUpdates: [],
        packet: {} as any,
      },
      meta: {
        storyId: "s1",
        chapterNumber: 1,
        arcId: "a1",
        hotHash: "",
        warmHash: "",
        sagaProgressPercent: null,
        arcProgressPercent: null,
        sagaProgressSource: null,
        arcProgressSource: null,
        sagaRange: null,
        arcRange: null,
        sagaPhase: null,
        arcPhase: null,
        activeTurningPoint: null,
        targetInputBudget: 6000,
      },
    },
    chapter: { chapterNumber: 1 },
    story: { id: "s1" },
    canon: {
      deadCharacterNames: [],
      knownCharacterNames: [],
      knownLocationNames: [],
      knownBloodlineNames: [],
      lockedFacts,
      realmByCharacter: {},
    },
  };
}

describe("lockedFactCheck", () => {
  it("passes when locked facts are respected", () => {
    const result = lockedFactCheck.run(
      makeInput("Thanh kiếm Thần Long là bảo vật truyền thừa.", [
        { topic: "Thanh kiếm Thần Long", fact: "bảo vật truyền thừa" },
      ]),
    );
    expect(result.pass).toBe(true);
  });

  it("fails when topic mentioned without locked fact", () => {
    const result = lockedFactCheck.run(
      makeInput("Thanh kiếm Thần Long là một vật phẩm bình thường.", [
        { topic: "Thanh kiếm Thần Long", fact: "bảo vật truyền thừa" },
      ]),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("Thanh kiếm Thần Long");
  });

  it("passes when locked fact topic is not mentioned", () => {
    const result = lockedFactCheck.run(
      makeInput("Lam Trach luyện kiếm trong rừng.", [
        { topic: "Thanh kiếm Thần Long", fact: "bảo vật truyền thừa" },
      ]),
    );
    expect(result.pass).toBe(true);
  });
});
