import { describe, it, expect } from "vitest";
import { repetitionCheck } from "../../../src/validators/deterministic/repetition.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(content: string): CheckInput {
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
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("repetitionCheck", () => {
  it("passes for varied content", () => {
    const result = repetitionCheck.run(
      makeInput(
        "Lam Trach bước vào rừng. Anh ta nhìn thấy một con suối. Bên kia suối là ngọn núi.",
      ),
    );
    expect(result.pass).toBe(true);
  });

  it("flags repeated sentences", () => {
    const content = "Anh ta bước đi xa xa. Anh ta bước đi xa xa.";
    const result = repetitionCheck.run(makeInput(content));
    expect(result.pass).toBe(false);
  });
});
