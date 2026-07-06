import { describe, it, expect } from "vitest";
import { targetWordCountCheck, wordCountCheck } from "../../../src/validators/deterministic/word-count.ts";
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

describe("targetWordCountCheck", () => {
  it("is high severity so target misses fail chapter completion", () => {
    expect(targetWordCountCheck.severity).toBe("high");
  });

  it("passes for content within target range", () => {
    const words = Array(2200).fill("word").join(" ");
    const result = targetWordCountCheck.run(makeInput(words));
    expect(result.pass).toBe(true);
  });

  it("flags content below target but above hard minimum", () => {
    const words = Array(1600).fill("word").join(" ");
    const result = targetWordCountCheck.run(makeInput(words));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("dưới mục tiêu");
  });

  it("flags content above target but below hard maximum", () => {
    const words = Array(3200).fill("word").join(" ");
    const result = targetWordCountCheck.run(makeInput(words));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("vượt mục tiêu");
  });
});
