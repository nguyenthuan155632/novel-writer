import { describe, it, expect } from "vitest";
import { deadCharacterCheck } from "../../../src/validators/deterministic/dead-character.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(content: string, deadCharacters: string[] = []): CheckInput {
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
      deadCharacterNames: deadCharacters,
      knownCharacterNames: [],
      knownLocationNames: [],
      knownBloodlineNames: [],
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("deadCharacterCheck", () => {
  it("passes when no dead characters appear", () => {
    const result = deadCharacterCheck.run(
      makeInput("Lam Trach đi vào rừng.", []),
    );
    expect(result.pass).toBe(true);
  });

  it("fails when dead character appears in content", () => {
    const result = deadCharacterCheck.run(
      makeInput("Nguyễn Vân nhìn về phía Minh Đức.", ["Minh Đức"]),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("Minh Đức");
  });

  it("passes when dead character is not mentioned", () => {
    const result = deadCharacterCheck.run(
      makeInput("Lam Trach luyện kiếm.", ["Minh Đức"]),
    );
    expect(result.pass).toBe(true);
  });
});
