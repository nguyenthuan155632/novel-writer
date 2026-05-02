import { describe, it, expect } from "vitest";
import { wordCountCheck } from "../../../src/validators/deterministic/word-count.ts";
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

describe("wordCountCheck", () => {
  it("passes for content within word range", () => {
    const words = Array(2000).fill("word").join(" ");
    const result = wordCountCheck.run(makeInput(words));
    expect(result.pass).toBe(true);
  });

  it("fails for content too short", () => {
    const result = wordCountCheck.run(makeInput("short content"));
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("quá ngắn");
  });

  it("fails for content too long", () => {
    const words = Array(5000).fill("word").join(" ");
    const result = wordCountCheck.run(makeInput(words));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("quá dài");
  });
});
