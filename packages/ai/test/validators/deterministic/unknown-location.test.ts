import { describe, it, expect } from "vitest";
import { unknownLocationCheck } from "../../../src/validators/deterministic/unknown-location.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(content: string, knownLocations: string[] = []): CheckInput {
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
      knownLocationNames: knownLocations,
      knownBloodlineNames: [],
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("unknownLocationCheck", () => {
  it("flags unknown location after travel/location prepositions", () => {
    const result = unknownLocationCheck.run(
      makeInput("Lam Trach đến Hắc Phong Cốc lúc nửa đêm."),
    );

    expect(result.pass).toBe(false);
    expect(result.issues).toContain(
      'Địa danh "Hắc Phong Cốc" không nằm trong danh sách known locations (phát hiện gần tiền vị từ chỉ nơi chốn).',
    );
  });

  it("does not flag metaphysical concepts as locations after generic prepositions", () => {
    const result = unknownLocationCheck.run(
      makeInput(
        "Lam Trach cảm nhận biến hóa trong Thiên Địa Nguyên Khí rồi vận chuyển chân khí.",
      ),
    );

    expect(result.pass).toBe(true);
  });
});
