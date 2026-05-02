import { describe, it, expect } from "vitest";
import {
  buildChecks,
  runDeterministicValidator,
} from "../../../src/validators/deterministic/runner.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(overrides: Partial<CheckInput> = {}): CheckInput {
  return {
    content:
      Array(2000).fill("word").join(" ") +
      " Đột nhiên một bóng hình xuất hiện. Anh ta chiến đấu。",
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
    ...overrides,
  };
}

describe("buildChecks", () => {
  it("returns all checks sorted by severity", () => {
    const checks = buildChecks("", "cultivation");
    // 12 prior checks + unknown_faction = 13 for cultivation.
    expect(checks.length).toBe(13);
    expect(checks[0]!.severity).toBe("critical");
    expect(checks[checks.length - 1]!.severity).toBe("low");
  });

  it("includes unknown_faction for every genre family", () => {
    expect(buildChecks("", "cultivation").map((c) => c.id)).toContain(
      "unknown_faction",
    );
    expect(buildChecks("", "ability").map((c) => c.id)).toContain(
      "unknown_faction",
    );
    expect(buildChecks("", "urban").map((c) => c.id)).toContain(
      "unknown_faction",
    );
  });
});

describe("runDeterministicValidator", () => {
  it("passes for valid content", () => {
    const checks = buildChecks("", "cultivation");
    const result = runDeterministicValidator(makeInput(), checks);
    expect(result.pass).toBe(true);
    expect(result.shortCircuited).toBe(false);
  });

  it("short-circuits on critical severity failure", () => {
    const checks = buildChecks("", "cultivation");
    const input = makeInput({
      content: "Minh Đức bước vào rừng.",
      canon: {
        deadCharacterNames: ["Minh Đức"],
        knownCharacterNames: [],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    expect(result.pass).toBe(false);
    expect(result.shortCircuited).toBe(true);
  });

  it("reports all issues when no critical failure", () => {
    const checks = buildChecks("", "cultivation");
    const input = makeInput({
      content: "Nội dung không có xung đột.",
      canon: {
        deadCharacterNames: [],
        knownCharacterNames: [],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    expect(result.pass).toBe(false);
    expect(result.shortCircuited).toBe(false);
  });
});

describe("buildChecks gating by genreFamily", () => {
  it("includes realm_jump and new_bloodline_source for cultivation", () => {
    const checks = buildChecks("forbidden text", "cultivation");
    const ids = checks.map((c) => c.id);
    expect(ids).toContain("realm_jump");
    expect(ids).toContain("new_bloodline_source");
  });

  it("omits realm_jump and new_bloodline_source for ability", () => {
    const checks = buildChecks("forbidden text", "ability");
    const ids = checks.map((c) => c.id);
    expect(ids).not.toContain("realm_jump");
    expect(ids).not.toContain("new_bloodline_source");
  });

  it("omits realm_jump for urban", () => {
    const checks = buildChecks("forbidden text", "urban");
    expect(checks.map((c) => c.id)).not.toContain("realm_jump");
  });
});

describe("llmVerifiable checks produce pendingVerification", () => {
  it("moves llmVerifiable check failures to pendingVerification instead of failing", () => {
    const checks = buildChecks("", "cultivation");
    // Content with unknown character near action verb to trigger unknown_character
    const input = makeInput({
      content:
        Array(2000).fill("word").join(" ") +
        " Đột nhiên Trần Đại Hiệp bước tới, rút kiếm chém xuống. Hắn chiến đấu với kẻ thù.",
      canon: {
        deadCharacterNames: [],
        knownCharacterNames: ["Lâm Phong"],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    // unknown_character is llmVerifiable, so it should NOT cause pass=false directly
    const charCheck = result.checks.find((c) => c.id === "unknown_character");
    expect(charCheck?.pass).toBe(true);
    expect(charCheck?.issues).toEqual([]);
    // Instead, issues go to pendingVerification
    expect(result.pendingVerification.length).toBeGreaterThan(0);
    expect(result.pendingVerification[0]!.checkId).toBe("unknown_character");
    expect(result.pendingVerification[0]!.snippet).toContain("Trần Đại Hiệp");
  });

  it("non-llmVerifiable checks still fail normally", () => {
    const checks = buildChecks("", "cultivation");
    const input = makeInput({
      content: "Short.",
      canon: {
        deadCharacterNames: [],
        knownCharacterNames: [],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    // word_count is NOT llmVerifiable, so it should fail directly
    const wcCheck = result.checks.find((c) => c.id === "word_count");
    expect(wcCheck?.pass).toBe(false);
    expect(result.pass).toBe(false);
    expect(result.pendingVerification.length).toBe(0);
  });
});
