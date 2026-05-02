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
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("repetitionCheck", () => {
  it("passes for varied content", () => {
    const result = repetitionCheck.run(
      makeInput(
        "Lam Trach bước vào khu rừng rậm rạp phía trước mặt. Anh ta nhìn thấy một con suối chảy xiết. Bên kia suối là ngọn núi cao vời vợi.",
      ),
    );
    expect(result.pass).toBe(true);
  });

  it("flags sentences repeated more than twice", () => {
    const sentence =
      "Hắn cảm thấy một luồng khí lực mãnh liệt tràn ngập cơ thể";
    const content = `${sentence}. ${sentence}. ${sentence}. Rồi hắn mở mắt ra.`;
    const result = repetitionCheck.run(makeInput(content));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("3 lần");
  });
});
