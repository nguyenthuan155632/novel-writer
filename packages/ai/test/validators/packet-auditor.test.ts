import { describe, expect, it } from "vitest";
import { auditPacket } from "../../src/validators/packet-auditor.ts";
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
