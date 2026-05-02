import { describe, it, expect } from "vitest";
import { unknownFactionCheck } from "../../../src/validators/deterministic/unknown-faction.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(
  content: string,
  knownFactions: string[] = [],
  knownCharacters: string[] = [],
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
      knownCharacterNames: knownCharacters,
      knownLocationNames: [],
      knownBloodlineNames: [],
      knownFactionNames: knownFactions,
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("unknownFactionCheck", () => {
  it("passes when the faction-prefixed name is in knownFactions", () => {
    const result = unknownFactionCheck.run(
      makeInput("Tông môn Thiên Kiếm Môn họp khẩn vào nửa đêm.", [
        "Thiên Kiếm Môn",
      ]),
    );
    expect(result.pass).toBe(true);
  });

  it("flags an unknown faction introduced after a faction prefix", () => {
    const result = unknownFactionCheck.run(
      makeInput("Tông môn Hỏa Vân Tông tuyên chiến với Bắc Di.", [
        "Thiên Kiếm Môn",
      ]),
    );
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toMatch(/Hỏa Vân Tông/);
  });

  it("does not flag proper nouns without a faction prefix", () => {
    const result = unknownFactionCheck.run(
      makeInput("Lam Trach bước vào sân đại điện. Vương Phong đứng chờ.", []),
    );
    expect(result.pass).toBe(true);
  });

  it("does not double-report the same unknown faction", () => {
    const result = unknownFactionCheck.run(
      makeInput(
        "Tông môn Hỏa Vân Tông xuất binh. Sau đó tông môn Hỏa Vân Tông rút lui.",
        [],
      ),
    );
    expect(result.issues).toHaveLength(1);
  });

  it("treats undefined knownFactionNames as empty (defensive)", () => {
    const input = makeInput("Tông môn Hỏa Vân Tông động binh.", []);
    delete (input.canon as { knownFactionNames?: unknown }).knownFactionNames;
    const result = unknownFactionCheck.run(input);
    expect(result.pass).toBe(false);
  });

  it("suppresses prefixed names that match a known character (e.g. surname collision)", () => {
    const result = unknownFactionCheck.run(
      makeInput("Tông môn Lam Trạch họp khẩn.", [], ["Lam Trạch"]),
    );
    expect(result.pass).toBe(true);
  });
});
