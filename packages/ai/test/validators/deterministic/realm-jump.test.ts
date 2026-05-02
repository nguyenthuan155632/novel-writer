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

  it("passes when one event generates several mentions", () => {
    const result = realmJumpCheck.run(
      makeInput(
        "Hắn chuẩn bị đột phá. Khí lực bùng nổ, đột phá thành công! Thăng cấp lên Tụ Khí. Lên cảnh giới mới rồi! Mọi người kinh ngạc hắn đột phá nhanh quá.",
        { "Lam Trach": "phàm nhân" },
      ),
    );
    // 5 mentions but only 1 actual event — under threshold of 24 (3 max × 8 per event)
    expect(result.pass).toBe(true);
  });

  it("passes when mentions are within the higher threshold", () => {
    // 8 mentions → ~1 estimated event ≤ max 3
    const result = realmJumpCheck.run(
      makeInput(
        "Đột phá lần một. Thăng cấp. Lên cảnh giới mới. Lại đột phá lần hai. Thăng cấp lần nữa. Lên cảnh giới cao hơn. Rồi lại đột phá. Lại thăng cấp.",
        { "Lam Trach": "phàm nhân" },
      ),
    );
    // 8 mentions / 8 per event = 1 event ≤ 3 max → pass
    expect(result.pass).toBe(true);
  });

  it("fails when mentions suggest too many breakthrough events", () => {
    // 25+ mentions → ~4 estimated events > max 3
    const content = Array(26).fill("đột phá").join(". ");
    const result = realmJumpCheck.run(
      makeInput(content, { "Lam Trach": "phàm nhân" }),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("sự kiện đột phá");
  });

  it("includes mention count in issue message", () => {
    // Need > 24 mentions to trigger failure
    const content = Array(30).fill("đột phá").join(". ");
    const result = realmJumpCheck.run(makeInput(content));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("lần nhắc");
  });
});
