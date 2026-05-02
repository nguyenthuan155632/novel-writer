import { describe, expect, it } from "vitest";
import type { ChapterContext } from "@novel/ai";
import { serializeContextForWriter } from "../../src/jobs/generate-chapter.js";

function makeContext(): ChapterContext {
  return {
    hot: {
      systemRules: "Never break canon.",
      bibleCompact: "A compact bible.",
      styleGuide: "Cinematic prose.",
      powerSystem: "Power has costs.",
      powerSystemKind: "ability",
      styleFewShots: [],
      genreContract: "# GENRE CONTRACT\nUrban fantasy only.",
      personalityContract: "# PROTAGONIST PERSONALITY CONTRACT\nPragmatic.",
      storyOptionsBlock: "# STORY OPTIONS\nTone: Dark | POV: First person",
    },
    warm: {
      sagaSummary: "Saga plan.",
      arcSummary: "Arc plan.",
      activeCharacters: [
        {
          id: "char-1",
          name: "Lam Trach",
          status: "alive",
          currentRealm: "none",
          faction: "Night Bureau",
          bloodlines: ["Moonline"],
          shortTraits: ["cautious"],
        },
      ],
      arcOpenThreads: [
        {
          id: "thread-1",
          title: "Missing witness",
          state: "open",
          introducedChapter: 2,
          plannedResolutionChapter: 8,
        },
      ],
      arcPlantedSeeds: [
        {
          id: "seed-1",
          seedText: "cracked badge",
          payoffDescription: "reveals betrayal",
          plantWindowStart: 3,
          plantWindowEnd: 5,
          status: "pending",
        },
      ],
      knownFactions: [
        {
          id: "faction-1",
          name: "Night Bureau",
          status: "active",
          type: "agency",
        },
      ],
    },
    cold: {
      recentSummaries: [{ chapterNumber: 4, summary: "Recent continuity." }],
      retrievedFacts: [
        {
          id: "fact-1",
          topic: "canon",
          importance: "locked",
          fact: "The witness is alive.",
        },
      ],
      retrievedPastChapters: [
        { chapterNumber: 1, summary: "Past continuity." },
      ],
      seedsToPlantNow: [
        {
          id: "seed-2",
          seedText: "red umbrella",
          payoffDescription: "marks the assassin",
          plantWindowStart: 5,
          plantWindowEnd: 5,
          status: "pending",
        },
      ],
      timelineEvents: [
        {
          chapterNumber: 3,
          eventType: "discovery",
          eventText: "The bureau archive burned.",
          importance: "high",
        },
      ],
      pendingCanonUpdates: [
        {
          id: "pending-1",
          updateType: "update",
          targetTable: "characters",
          conflictStatus: "conflict",
          conflictReasons: ["status mismatch"],
          summary: "Witness status disputed",
        },
      ],
      packet: {
        chapterNumber: 5,
        goal: "Find the witness.",
        requiredEvents: [{ description: "Plant the red umbrella seed." }],
        charactersPresent: ["Lam Trach"],
        conflict: "The bureau blocks access.",
        cliffhanger: "The witness calls from inside the bureau.",
        forbiddenMoves: ["resolve betrayal"],
      },
    },
    meta: {
      storyId: "story-1",
      chapterNumber: 5,
      arcId: "arc-1",
      hotHash: "hot",
      warmHash: "warm",
      sagaProgressPercent: 25,
      arcProgressPercent: 50,
      sagaProgressSource: "story_target_fallback",
      arcProgressSource: "planned_range",
      sagaRange: "25/100",
      arcRange: "5/10",
      sagaPhase: "setup",
      arcPhase: "development",
      activeTurningPoint: "Find the witness",
      targetInputBudget: 6000,
    },
  };
}

describe("serializeContextForWriter", () => {
  it("renders critical story context sections for the writer LLM", () => {
    const out = serializeContextForWriter(makeContext());

    expect(out).toContain("# GENRE CONTRACT");
    expect(out).toContain("# STORY OPTIONS");
    expect(out).toContain("# STORY PROGRESS");
    expect(out).toContain("source=story_target_fallback");
    expect(out).toContain("# SAGA SUMMARY");
    expect(out).toContain("# ARC SUMMARY");
    expect(out).toContain("# ACTIVE CHARACTERS");
    expect(out).toContain("bloodlines=[Moonline]");
    expect(out).toContain("# OPEN THREADS");
    expect(out).toContain("# PLANTED SEEDS");
    expect(out).toContain("# KNOWN FACTIONS");
    expect(out).toContain("# RECENT SUMMARIES");
    expect(out).toContain("# CANON FACTS");
    expect(out).toContain("# PAST CHAPTER SUMMARIES");
    expect(out).toContain("# SEEDS DUE THIS CHAPTER");
    expect(out).toContain("# TIMELINE EVENTS");
    expect(out).toContain("# PENDING CANON UPDATES");
    expect(out).toContain("# CHAPTER PLAN");
  });

  it("injects POWER PROGRESSION section when realmLadder is provided", () => {
    const ladder = ["võ đồ", "võ sư", "võ vương", "võ hoàng", "võ đế"];
    const out = serializeContextForWriter(makeContext(), {
      realmLadder: ladder,
    });
    expect(out).toContain("# POWER PROGRESSION (thấp → cao)");
    expect(out).toContain("võ đồ → võ sư → võ vương → võ hoàng → võ đế");
  });

  it("does NOT inject POWER PROGRESSION when realmLadder is empty", () => {
    const out = serializeContextForWriter(makeContext(), { realmLadder: [] });
    expect(out).not.toContain("POWER PROGRESSION");
  });
});
