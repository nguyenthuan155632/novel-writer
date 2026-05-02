import { describe, expect, it } from "vitest";
import { shrinkToFit } from "../../src/context/shrink.js";
import type {
  ChapterContext,
  HotTier,
  WarmTier,
  ColdTier,
  CharacterCompact,
} from "../../src/context/types.js";
import { estimateTokensJson } from "@novel/core/utils/tokens";

function makeContext(overrides?: {
  hot?: Partial<HotTier>;
  warm?: Partial<WarmTier>;
  cold?: Partial<ColdTier>;
}): ChapterContext {
  return {
    hot: {
      systemRules: "rules",
      bibleCompact: "compact",
      styleGuide: "guide",
      powerSystem: "power",
      powerSystemKind: "",
      genreContract: "",
      personalityContract: "",
      storyOptionsBlock: "",
      styleFewShots: [],
      ...overrides?.hot,
    },
    warm: {
      sagaSummary: "saga",
      arcSummary: "arc",
      activeCharacters: [],
      arcOpenThreads: [],
      arcPlantedSeeds: [],
      ...overrides?.warm,
    },
    cold: {
      recentSummaries: [],
      retrievedFacts: [],
      retrievedPastChapters: [],
      seedsToPlantNow: [],
      timelineEvents: [],
      pendingCanonUpdates: [],
      packet: {
        chapterNumber: 1,
        goal: "test goal",
        requiredEvents: [],
        charactersPresent: [],
        conflict: "test conflict",
        cliffhanger: "test cliffhanger",
        forbiddenMoves: [],
      },
      ...overrides?.cold,
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
  };
}

describe("shrinkToFit", () => {
  it("does not shrink when already within budget", () => {
    const ctx = makeContext();
    const budget = 100000;
    const result = shrinkToFit(ctx, budget);
    expect(result.cold.retrievedPastChapters).toEqual([]);
    expect(result.cold.retrievedFacts).toEqual([]);
  });

  it("drops retrievedPastChapters first", () => {
    const ctx = makeContext({
      cold: {
        recentSummaries: [{ chapterNumber: 1, summary: "a".repeat(1000) }],
        retrievedFacts: [
          {
            id: "f1",
            topic: "magic",
            importance: "high",
            fact: "b".repeat(200),
          },
        ],
        retrievedPastChapters: [
          { chapterNumber: 1, summary: "c".repeat(1000) },
        ],
        seedsToPlantNow: [],
        packet: {
          chapterNumber: 1,
          goal: "g",
          requiredEvents: [],
          charactersPresent: [],
          conflict: "c",
          cliffhanger: "h",
          forbiddenMoves: [],
        },
      },
    });
    const smallBudget = 50;
    const result = shrinkToFit(ctx, smallBudget);
    expect(result.cold.retrievedPastChapters).toEqual([]);
  });

  it("drops retrievedFacts second", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [],
        retrievedFacts: [
          { id: "f1", topic: "realm", importance: "high", fact: "fact" },
        ],
        recentSummaries: [],
        seedsToPlantNow: [],
        packet: {
          chapterNumber: 1,
          goal: "g",
          requiredEvents: [],
          charactersPresent: [],
          conflict: "c",
          cliffhanger: "h",
          forbiddenMoves: [],
        },
      },
    });
    const totalTokens = estimateTokensJson(ctx);
    const budget = totalTokens - 10;
    const result = shrinkToFit(ctx, budget);
    expect(result.cold.retrievedFacts).toEqual([]);
  });

  it("strips character optional fields in compact mode", () => {
    const fullChar: CharacterCompact = {
      id: "c1",
      name: "Linh",
      currentRealm: "kim đan",
      status: "alive",
      bloodlines: ["Hỏa Long"],
      faction: "Thiên Môn",
      shortTraits: ["dũng cảm"],
    };
    const ctx = makeContext({
      warm: { activeCharacters: [fullChar] },
    });
    const smallBudget = 10;
    const result = shrinkToFit(ctx, smallBudget);
    expect(result.warm.activeCharacters[0]).toEqual({
      id: "c1",
      name: "Linh",
      status: "alive",
      bloodlines: [],
      shortTraits: [],
    });
  });

  it("does not mutate the original context", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [{ chapterNumber: 5, summary: "test" }],
        retrievedFacts: [
          { id: "f1", topic: "realm", importance: "high", fact: "fact" },
        ],
        recentSummaries: [],
        seedsToPlantNow: [],
        packet: {
          chapterNumber: 1,
          goal: "g",
          requiredEvents: [],
          charactersPresent: [],
          conflict: "c",
          cliffhanger: "h",
          forbiddenMoves: [],
        },
      },
    });
    const origPastChapters = [...ctx.cold.retrievedPastChapters];
    const origFacts = [...ctx.cold.retrievedFacts];
    shrinkToFit(ctx, 10);
    expect(ctx.cold.retrievedPastChapters).toEqual(origPastChapters);
    expect(ctx.cold.retrievedFacts).toEqual(origFacts);
  });
});
