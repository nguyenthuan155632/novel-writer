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
        seedsAutoEnforced: [],
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
      sagaProgressSource: null,
      arcProgressSource: null,
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
    expect(result).toEqual(ctx);
  });

  it("keeps retrievedPastChapters unchanged", () => {
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
      },
    });
    const result = shrinkToFit(ctx, 50);
    expect(result.cold.retrievedPastChapters).toEqual([
      { chapterNumber: 1, summary: "c".repeat(1000) },
    ]);
  });

  it("raises retrievedFacts threshold before other cold drops", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [],
        retrievedFacts: [
          { id: "f1", topic: "realm", importance: "high", fact: "high fact" },
          { id: "f2", topic: "rule", importance: "locked", fact: "locked fact" },
        ],
      },
    });
    const budget = estimateTokensJson(ctx) - 10;
    const result = shrinkToFit(ctx, budget);
    expect(result.cold.retrievedFacts).toEqual([
      { id: "f2", topic: "rule", importance: "locked", fact: "locked fact" },
    ]);
  });

  it("increases recent summaries min gap by five", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [],
        retrievedFacts: [],
        recentSummaries: [
          { chapterNumber: 20, summary: "latest" },
          { chapterNumber: 16, summary: "too close" },
          { chapterNumber: 10, summary: "keep" },
        ],
      },
    });
    const result = shrinkToFit(ctx, 10);
    expect(result.cold.recentSummaries).toEqual([
      { chapterNumber: 20, summary: "latest" },
      { chapterNumber: 10, summary: "keep" },
    ]);
  });

  it("drops oldest pending canon updates before timeline events if still over budget", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [],
        retrievedFacts: [{ id: 'f1', topic: 'realm', importance: 'high', fact: 'fact' }],
        recentSummaries: [{ chapterNumber: 1, summary: 'sum' }],
        pendingCanonUpdates: [
          { id: 'p1', updateType: 'create', targetTable: 'canon_facts', conflictStatus: 'none', conflictReasons: [], summary: 'older' },
          { id: 'p2', updateType: 'create', targetTable: 'canon_facts', conflictStatus: 'none', conflictReasons: [], summary: 'newer' },
        ],
        timelineEvents: [
          { chapterNumber: 1, eventType: 'battle', eventText: 'older event', importance: 'high' },
          { chapterNumber: 2, eventType: 'battle', eventText: 'newer event', importance: 'high' },
        ],
      },
    });
    const result = shrinkToFit(ctx, 1);
    expect(result.cold.pendingCanonUpdates).toEqual([{ id: 'p1', updateType: 'create', targetTable: 'canon_facts', conflictStatus: 'none', conflictReasons: [], summary: 'older' }]);
    expect(result.cold.timelineEvents).toEqual([{ chapterNumber: 1, eventType: 'battle', eventText: 'older event', importance: 'high' }]);
  });

  it("trims activeCharacters by lastActiveChapter and keeps at least three", () => {
    const chars: CharacterCompact[] = [
      {
        id: 'c1',
        name: 'A',
        currentRealm: 'realm-1',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 1,
      },
      {
        id: 'c2',
        name: 'B',
        currentRealm: 'realm-2',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 20,
      },
      {
        id: 'c3',
        name: 'C',
        currentRealm: 'realm-3',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 10,
      },
      {
        id: 'c4',
        name: 'D',
        currentRealm: 'realm-4',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 30,
      },
    ];
    const ctx = makeContext({ warm: { activeCharacters: chars } });
    const result = shrinkToFit(ctx, 10);
    expect(result.warm.activeCharacters).toEqual([
      {
        id: 'c4',
        name: 'D',
        status: 'alive',
        bloodlines: [],
        shortTraits: [],
        lastActiveChapter: 30,
      },
      {
        id: 'c2',
        name: 'B',
        status: 'alive',
        bloodlines: [],
        shortTraits: [],
        lastActiveChapter: 20,
      },
      {
        id: 'c3',
        name: 'C',
        status: 'alive',
        bloodlines: [],
        shortTraits: [],
        lastActiveChapter: 10,
      },
    ]);
  });

  it("does not trim characters required by the chapter packet", () => {
    const chars: CharacterCompact[] = [
      {
        id: 'c1',
        name: 'A',
        currentRealm: 'realm-1',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 1,
      },
      {
        id: 'c2',
        name: 'B',
        currentRealm: 'realm-2',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 20,
      },
      {
        id: 'c3',
        name: 'C',
        currentRealm: 'realm-3',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 10,
      },
      {
        id: 'c4',
        name: 'D',
        currentRealm: 'realm-4',
        status: 'alive',
        bloodlines: ['x'],
        shortTraits: ['t'],
        lastActiveChapter: 30,
      },
    ];
    const ctx = makeContext({
      warm: { activeCharacters: chars },
      cold: {
        packet: {
          chapterNumber: 1,
          goal: "test goal",
          requiredEvents: [],
          charactersPresent: ['A'],
          conflict: "test conflict",
          cliffhanger: "test cliffhanger",
          forbiddenMoves: [],
          seedsAutoEnforced: [],
        },
      },
    });
    const result = shrinkToFit(ctx, 10);
    expect(result.warm.activeCharacters.map((c) => c.name)).toEqual(['D', 'B', 'A']);
  });

  it("keeps hot tier intact", () => {
    const ctx = makeContext({ hot: { systemRules: 'HOT-RULES' } });
    const result = shrinkToFit(ctx, 1);
    expect(result.hot.systemRules).toBe('HOT-RULES');
  });

  it("does not mutate original context", () => {
    const ctx = makeContext({
      cold: {
        retrievedPastChapters: [{ chapterNumber: 5, summary: 'test' }],
        retrievedFacts: [
          { id: 'f1', topic: 'realm', importance: 'high', fact: 'fact' },
        ],
      },
    });
    const origPastChapters = [...ctx.cold.retrievedPastChapters];
    const origFacts = [...ctx.cold.retrievedFacts];
    shrinkToFit(ctx, 10);
    expect(ctx.cold.retrievedPastChapters).toEqual(origPastChapters);
    expect(ctx.cold.retrievedFacts).toEqual(origFacts);
  });

  it("ends within budget for oversized context", () => {
    const ctx = makeContext({
      warm: {
        activeCharacters: [
          { id: 'c1', name: 'A', currentRealm: 'realm-1', status: 'alive', bloodlines: ['x'], shortTraits: ['t'] },
          { id: 'c2', name: 'B', currentRealm: 'realm-2', status: 'alive', bloodlines: ['x'], shortTraits: ['t'] },
          { id: 'c3', name: 'C', currentRealm: 'realm-3', status: 'alive', bloodlines: ['x'], shortTraits: ['t'] },
          { id: 'c4', name: 'D', currentRealm: 'realm-4', status: 'alive', bloodlines: ['x'], shortTraits: ['t'] },
        ],
      },
      cold: {
        recentSummaries: [
          { chapterNumber: 20, summary: 'a'.repeat(500) },
          { chapterNumber: 16, summary: 'b'.repeat(500) },
          { chapterNumber: 10, summary: 'c'.repeat(500) },
        ],
        retrievedFacts: [
          { id: 'f1', topic: 'x', importance: 'high', fact: 'd'.repeat(500) },
          { id: 'f2', topic: 'y', importance: 'locked', fact: 'e'.repeat(500) },
        ],
        retrievedPastChapters: [{ chapterNumber: 1, summary: 'f'.repeat(500) }],
        pendingCanonUpdates: [
          { id: 'p1', updateType: 'create', targetTable: 'canon_facts', conflictStatus: 'none', conflictReasons: [], summary: 'g'.repeat(500) },
          { id: 'p2', updateType: 'create', targetTable: 'canon_facts', conflictStatus: 'none', conflictReasons: [], summary: 'h'.repeat(500) },
        ],
        timelineEvents: [
          { chapterNumber: 1, eventType: 'battle', eventText: 'i'.repeat(500), importance: 'high' },
          { chapterNumber: 2, eventType: 'battle', eventText: 'j'.repeat(500), importance: 'high' },
        ],
      },
    });
    const result = shrinkToFit(ctx, 1200);
    // shrinkReport is observability metadata, not prompt content — exclude it
    // from the budget check (the loop that trims content runs before it's attached).
    const { shrinkReport: _shrinkReport, ...restMeta } = result.meta;
    expect(estimateTokensJson({ ...result, meta: restMeta })).toBeLessThanOrEqual(1200);
  });
});
