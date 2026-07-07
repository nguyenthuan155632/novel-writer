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

  it("allows missing cliffhanger", () => {
    const r = auditPacket(
      {
        packet: { ...basePacket, cliffhanger: "" } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "cultivation" },
    );
    expect(r.pass).toBe(true);
    expect(r.issues.find((i) => i.code === "missing_cliffhanger")).toBeUndefined();
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

  it("requires regeneration when packet pulls a named future turning point early", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          chapterNumber: 9,
          goal: "Lâm Triều đến thăm cụ Tú để hỏi chuyện xưa",
          requiredEvents: [{ description: "Lâm Triều hỏi thăm nhà cụ Tú ở bến sông." }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
        futureTurningPoints: ["Gặp cụ Tú - người biết chuyện xưa (chương 12)"],
      },
      { genreFamily: "mixed" },
    );

    expect(r.pass).toBe(false);
    expect(r.requiresRegenerate).toBe(true);
    expect(r.issues.some((i) => i.code === "future_turning_point")).toBe(true);
  });

  it("allows future turning point anchors at their planned chapter", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          chapterNumber: 12,
          goal: "Lâm Triều gặp cụ Tú để hỏi chuyện xưa",
          requiredEvents: [{ description: "Lâm Triều gặp cụ Tú ở bến sông." }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
        futureTurningPoints: ["Gặp cụ Tú - người biết chuyện xưa (chương 12)"],
      },
      { genreFamily: "mixed" },
    );

    expect(r.issues.some((i) => i.code === "future_turning_point")).toBe(false);
  });

  it("requires regeneration when a quiet slice packet plans active night investigation", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          chapterPurpose: "slice_of_life",
          endingMode: "quiet_transition",
          goal: "Khắc họa đời sống thường ngày",
          conflict: "Lâm Triều muốn giữ bình tĩnh nhưng nghe tin đồn lạ",
          requiredEvents: [
            {
              description:
                "Buổi trưa hắn quyết định tối nay tự mình ra bờ sông quan sát bóng người áo đen biến mất gần miếu hoang.",
            },
          ],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "mixed" },
    );

    expect(r.pass).toBe(false);
    expect(r.requiresRegenerate).toBe(true);
    expect(r.issues.some((i) => i.code === "purpose_ending_mismatch")).toBe(true);
  });

  it("allows quiet slice packets with ordinary observation and work texture", () => {
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          chapterPurpose: "slice_of_life",
          endingMode: "quiet_transition",
          goal: "Khắc họa một ngày làm việc ở kho",
          conflict: "Lâm Triều giữ bình tĩnh sau chuyện cũ",
          requiredEvents: [
            { description: "Lâm Triều cân gạo cho dân phố, ghi sổ và nghe vài lời than mùa màng." },
            { description: "Buổi chiều hắn ngồi câu cá, quan sát dòng nước và tự nhắc mình không vội." },
          ],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "",
        duePlantedSeeds: [],
      },
      { genreFamily: "mixed" },
    );

    expect(r.issues.some((i) => i.code === "purpose_ending_mismatch")).toBe(false);
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

  it("does not flag forbidden phrase found only in forbiddenMoves field", () => {
    // packet.forbiddenMoves describes what the writer must avoid, not planned story content.
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
    expect(r.issues.some((i) => i.code === "forbidden_move")).toBe(false);
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

  it("no false positive when forbiddenRules present but no phrase matched in packet", () => {
    // Rules are non-empty but the packet contains none of the forbidden phrases
    const r = auditPacket(
      {
        packet: {
          ...basePacket,
          goal: "Lam Trach tìm kiếm báu vật trong rừng",
          requiredEvents: [{ description: "Phát hiện dấu vết kỳ lạ trên vách núi" }],
        } as any,
        characters: [aliveChar],
        forbiddenRules: "giết sư phụ\nphản bội tông môn",
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
    expect(MANDATORY_REGEN_CODES.has("future_turning_point")).toBe(true);
    expect(MANDATORY_REGEN_CODES.has("purpose_ending_mismatch")).toBe(true);
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
  chapterPurpose: "plot_progression",
  endingMode: "open_question",
  setting: "s",
  notes: "n",
  charactersPresent: ["Lý Phong"],
  forbiddenMoves: [],
  toneHints: [],
  seedsAutoEnforced: [],
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
