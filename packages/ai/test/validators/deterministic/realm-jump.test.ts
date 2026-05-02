import { describe, it, expect } from "vitest";
import { realmJumpCheck } from "../../../src/validators/deterministic/realm-jump.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(
  content: string,
  realmByCharacter: Record<string, string | undefined> = {},
): CheckInput {
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
      realmByCharacter,
    },
  };
}

describe("realmJumpCheck", () => {
  it("has severity high (not critical)", () => {
    expect(realmJumpCheck.severity).toBe("high");
  });

  it("passes when no breakthroughs in content", () => {
    const result = realmJumpCheck.run(
      makeInput("Lam Trach luyện kiếm trong rừng."),
    );
    expect(result.pass).toBe(true);
  });

  it("passes when exactly one breakthrough", () => {
    const result = realmJumpCheck.run(
      makeInput("Lam Trach đột phá thành công lên luyện khí.", {
        "Lam Trach": "phàm nhân",
      }),
    );
    expect(result.pass).toBe(true);
  });

  it("fails when multiple breakthroughs detected", () => {
    const result = realmJumpCheck.run(
      makeInput(
        "Lam Trach đột phá cảnh giới luyện khí. Sau đó, anh lại đột phá lần nữa.",
        { "Lam Trach": "phàm nhân" },
      ),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("Lam Trach");
  });

  it("fails with generic message when no character realm info", () => {
    const result = realmJumpCheck.run(
      makeInput("Hắn đột phá cảnh giới. Rồi lại đột phá thêm lần nữa."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).not.toContain("(");
  });

  // Known limitation: global word-count means enemy/flashback breakthroughs
  // also increment the counter. Accepted tradeoff — severity is 'high' not 'critical'.
  it("known limitation: counts all breakthrough keywords regardless of subject", () => {
    const result = realmJumpCheck.run(
      makeInput(
        "Địch nhân đột phá. Lam Trach quan sát. Tên địch lại đột phá thêm một lần.",
        { "Lam Trach": "luyện khí" },
      ),
    );
    // Two "đột phá" by the enemy — Lam Trach did not break through, but check still fires.
    expect(result.pass).toBe(false);
  });
});
