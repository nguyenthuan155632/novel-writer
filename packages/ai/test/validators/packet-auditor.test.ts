import { describe, expect, it } from "vitest";
import { auditPacket, MANDATORY_REGEN_CODES } from "../../src/validators/packet-auditor.ts";
import type { ChapterPacket } from "../../src/schemas/packet.ts";

const basePacket = {
  chapterNumber: 5,
  goal: "g",
  requiredEvents: [{ description: "fight bandit" }],
  charactersPresent: ["Lam Trach"],
  conflict: "fight bandits in forest",
  cliffhanger: "mysterious figure appears",
  forbiddenMoves: [],
};

const aliveChar = {
  name: "Lam Trach",
  status: "alive",
  currentRealm: "luyện khí",
};

describe("auditPacket", () => {
  it("passes valid packet", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("flags dead character", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [{ ...aliveChar, status: "dead" }],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.pass).toBe(false);
    expect(r.issues[0]!.code).toBe("dead_character");
  });

  it("flags missing cliffhanger", () => {
    const r = auditPacket(
      {
        packet: { ...basePacket, cliffhanger: "" } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.pass).toBe(false);
    expect(r.issues.find((i) => i.code === "missing_cliffhanger")).toBeTruthy();
  });

  it("flags unresolved due seed at last-window-chapter", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [
          { id: "seed-1", seedText: "red figure", plantWindowEnd: 5 },
        ],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.pass).toBe(false);
    expect(
      r.issues.find((i) => i.code === "unresolved_due_seed")!.severity,
    ).toBe("critical");
  });
});

// §1.4 — forbidden_move in packet-auditor
describe("auditPacket forbidden_move", () => {
  it("flags forbidden phrase found in requiredEvents description", () => {
    // Rule text appears verbatim in the event description
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          requiredEvents: [{ description: "giết sư phụ xảy ra trong chương" }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "giết sư phụ",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.issues.some((i) => i.code === "forbidden_move")).toBe(true);
  });

  it("flags forbidden phrase found in forbiddenMoves field", () => {
    // packet.forbiddenMoves echoes the exact banned phrase from rules
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          forbiddenMoves: ["giết sư phụ"],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "giết sư phụ",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.issues.some((i) => i.code === "forbidden_move")).toBe(true);
  });

  it("no false positive when forbiddenRules is empty", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.issues.some((i) => i.code === "forbidden_move")).toBe(false);
  });
});

// §1.5 — locked_fact_candidate and locked_fact
describe("auditPacket locked fact candidates", () => {
  it("emits locked_fact_candidate (non-blocking) when topic mentioned without contradiction", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          goal: "Lam Trach tranh đoạt thần khí",
          requiredEvents: [{ description: "Tìm kiếm thần khí trong hang" }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
        lockedFactCandidates: [
          { id: "f1", fact: "Thần khí ở Hắc Lâm", topic: "thần khí", lockedFields: [] },
        ],
      },
      { genreFamily: "cultivation" },
    );
    const candidate = r.issues.find((i) => i.code === "locked_fact_candidate");
    expect(candidate).toBeTruthy();
    expect(candidate!.severity).toBe("medium");
    // Should NOT be in MANDATORY_REGEN_CODES → requiresRegenerate=false (unless other issues)
    expect(MANDATORY_REGEN_CODES.has("locked_fact_candidate")).toBe(false);
  });

  it("emits blocking locked_fact when locked field explicitly contradicted", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          goal: "Lam Trach thay đổi trạng thái thần khí",
          requiredEvents: [{ description: "thần khí bị phá hủy trong hang" }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
        lockedFactCandidates: [
          {
            id: "f1",
            fact: "Thần khí không thể bị phá hủy",
            topic: "thần khí",
            lockedFields: ["thần khí"],
          },
        ],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.issues.some((i) => i.code === "locked_fact")).toBe(true);
  });

  it("no issue when unrelated topic — no false positive", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
        lockedFactCandidates: [
          { id: "f1", fact: "Rồng ở phía Bắc", topic: "rồng phương bắc", lockedFields: [] },
        ],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.issues.some((i) => i.code === "locked_fact_candidate")).toBe(false);
    expect(r.issues.some((i) => i.code === "locked_fact")).toBe(false);
  });
});

// §1.7 — MANDATORY_REGEN_CODES set
describe("MANDATORY_REGEN_CODES and requiresRegenerate", () => {
  it("MANDATORY_REGEN_CODES contains locked_fact, dead_character, realm_jump_excess", () => {
    expect(MANDATORY_REGEN_CODES.has("locked_fact")).toBe(true);
    expect(MANDATORY_REGEN_CODES.has("dead_character")).toBe(true);
    expect(MANDATORY_REGEN_CODES.has("realm_jump_excess")).toBe(true);
  });

  it("locked_fact_candidate is NOT in MANDATORY_REGEN_CODES", () => {
    expect(MANDATORY_REGEN_CODES.has("locked_fact_candidate")).toBe(false);
  });

  it("requiresRegenerate=true when dead_character present", () => {
    const r = auditPacket(
      {
        packet: basePacket as any,
        characters: [{ ...aliveChar, status: "dead" }],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.requiresRegenerate).toBe(true);
  });
});

const baseRealmPacket: ChapterPacket = {
  chapterNumber: 5,
  goal: "Một mục tiêu rõ ràng",
  conflict: "Mâu thuẫn rõ ràng",
  cliffhanger: "Cliffhanger rõ ràng",
  setting: "s",
  notes: "n",
  charactersPresent: ["Lý Phong"],
  forbiddenMoves: [],
  toneHints: [],
  requiredEvents: [
    { description: "Đột phá cảnh giới mới", seedId: "" },
    { description: "Đột phá lần thứ hai", seedId: "" },
    { description: "Đột phá lần thứ ba", seedId: "" },
  ],
};

describe("auditPacket realm-jump gating", () => {
  it("fires realm_jump_excess when realmLadder is provided", () => {
    const result = auditPacket(
      {
        packet: baseRealmPacket,
        characters: [
          { name: "Lý Phong", status: "alive", currentRealm: "luyện khí" },
        ],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      {
        genreFamily: "cultivation",
        realmLadder: [
          "phàm nhân",
          "luyện khí",
          "trúc cơ",
          "kim đan",
          "nguyên anh",
        ],
      },
    );
    expect(result.issues.some((i) => i.code === "realm_jump_excess")).toBe(
      true,
    );
  });

  it("fires realm_jump_excess for non-cultivation genre when realmLadder is provided", () => {
    const result = auditPacket(
      {
        packet: baseRealmPacket,
        characters: [
          { name: "Lý Phong", status: "alive", currentRealm: "luyện khí" },
        ],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      {
        genreFamily: "ability",
        realmLadder: ["phàm nhân", "luyện khí", "trúc cơ", "kim đan"],
      },
    );
    expect(result.issues.some((i) => i.code === "realm_jump_excess")).toBe(
      true,
    );
  });

  it("does NOT fire realm_jump_excess when no realmLadder", () => {
    const result = auditPacket(
      {
        packet: baseRealmPacket,
        characters: [
          { name: "Lý Phong", status: "alive", currentRealm: "luyện khí" },
        ],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "ability" },
    );
    expect(result.issues.some((i) => i.code === "realm_jump_excess")).toBe(
      false,
    );
  });
});
