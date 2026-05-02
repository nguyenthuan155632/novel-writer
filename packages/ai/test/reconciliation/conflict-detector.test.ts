import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  type CanonSnapshot,
} from "../../src/reconciliation/conflict-detector.ts";
import { DEFAULT_REALM_LADDER } from "../../src/utils/realm-order.ts";
import type { ExtractorOutput } from "../../src/schemas/extractor.ts";

const BASE_SNAPSHOT: CanonSnapshot = {
  characters: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Lam Trach",
      currentRealm: "kim đan",
      status: "alive",
      currentBloodlines: ["Hỏa Long"],
      faction: "Thiên Kiếm Môn",
      lockedFields: [],
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Tô Mộc",
      currentRealm: "trúc cơ",
      status: "dead",
      currentBloodlines: [],
      faction: "",
      lockedFields: ["status"],
    },
  ],
  realmLadder: [...DEFAULT_REALM_LADDER],
  canonFacts: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      fact: "Hỏa Long huyết mạch chỉ truyền nam",
      importance: "high",
      locked: false,
    },
  ],
  threads: [
    {
      id: "44444444-4444-4444-4444-444444444444",
      title: "Lam Trach báo thù",
      status: "open",
    },
    {
      id: "55555555-5555-5555-5555-555555555555",
      title: "Sách cổ thất truyền",
      status: "resolved",
    },
  ],
  factions: [
    {
      id: "66666666-6666-6666-6666-666666666666",
      name: "Thiên Kiếm Môn",
      status: "active",
      type: "sect",
      lockedFields: [],
    },
    {
      id: "77777777-7777-7777-7777-777777777777",
      name: "Hắc Phong Trại",
      status: "destroyed",
      type: "bandit",
      lockedFields: ["status"],
    },
  ],
};

describe("detectConflicts", () => {
  it("returns empty for clean updates", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "11111111-1111-1111-1111-111111111111",
          name: "Lam Trach",
          fields: { currentRealm: "nguyên anh" },
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(0);
  });

  it("detects locked field conflict and dead character action", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "22222222-2222-2222-2222-222222222222",
          name: "Tô Mộc",
          fields: { status: "alive" },
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts.some((c) => c.type === "locked_field")).toBe(true);
  });

  it("detects realm regression without intentionalRegression flag", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "11111111-1111-1111-1111-111111111111",
          name: "Lam Trach",
          fields: { currentRealm: "luyện khí" },
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.type).toBe("realm_regression");
  });

  it("allows realm regression with intentionalRegression flag", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "11111111-1111-1111-1111-111111111111",
          name: "Lam Trach",
          fields: { currentRealm: "luyện khí" },
          intentionalRegression: true,
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(0);
  });

  it("detects duplicate canon fact", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [
        {
          topic: "Huyết mạch",
          fact: "Hỏa Long huyết mạch chỉ truyền nam",
          importance: "medium",
        },
      ],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.type).toBe("duplicate_fact");
  });

  it("detects dead character field update", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "22222222-2222-2222-2222-222222222222",
          name: "Tô Mộc",
          fields: { currentRealm: "kim đan" },
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts.some((c) => c.type === "dead_character_action")).toBe(
      true,
    );
  });

  it("detects thread status invalid (reopen resolved)", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [
        {
          action: "update",
          targetId: "55555555-5555-5555-5555-555555555555",
          title: "Sách cổ thất truyền",
          state: "open",
        },
      ],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.type).toBe("thread_status_invalid");
  });

  it("flags duplicate-faction create against an existing faction", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [
        {
          action: "create",
          name: "Thiên Kiếm Môn",
          fields: { type: "sect" },
        },
      ],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.type).toBe("duplicate_faction");
    expect(conflicts[0]!.targetTable).toBe("factions");
  });

  it("flags non-status/non-notes updates against a destroyed faction", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [
        {
          action: "update",
          targetId: "77777777-7777-7777-7777-777777777777",
          name: "Hắc Phong Trại",
          fields: { alliances: ["Thiên Kiếm Môn"] },
        },
      ],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts.some((c) => c.type === "destroyed_faction_action")).toBe(
      true,
    );
  });

  it("also flags status changes on destroyed factions because status is locked", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [
        {
          action: "update",
          targetId: "77777777-7777-7777-7777-777777777777",
          name: "Hắc Phong Trại",
          fields: { status: "active" },
        },
      ],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(
      conflicts.some(
        (c) => c.type === "locked_field" && c.payloadKey === "status",
      ),
    ).toBe(true);
  });

  it("allows a notes-only update on a destroyed faction", () => {
    const extracted: ExtractorOutput = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [
        {
          action: "update",
          targetId: "77777777-7777-7777-7777-777777777777",
          name: "Hắc Phong Trại",
          fields: { notes: "Tàn dư bị truy bắt khắp nơi." },
        },
      ],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, BASE_SNAPSHOT);
    expect(conflicts).toHaveLength(0);
  });

  it("detects multiple conflicts from same update", () => {
    const snapshot: CanonSnapshot = {
      characters: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Lam Trach",
          currentRealm: "kim đan",
          status: "alive",
          currentBloodlines: ["Hỏa Long"],
          lockedFields: ["currentRealm", "status"],
        },
      ],
      canonFacts: [],
      threads: [],
    };
    const extracted: ExtractorOutput = {
      characterUpdates: [
        {
          action: "update",
          targetId: "11111111-1111-1111-1111-111111111111",
          name: "Lam Trach",
          fields: { currentRealm: "trúc cơ", status: "missing" },
        },
      ],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [],
      seedsResolvedThisChapter: [],
    };
    const conflicts = detectConflicts(extracted, snapshot);
    expect(conflicts.length).toBeGreaterThanOrEqual(2);
    expect(conflicts.filter((c) => c.type === "locked_field").length).toBe(2);
  });
});
