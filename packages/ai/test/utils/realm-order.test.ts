import { describe, it, expect } from "vitest";
import {
  parseRealmLadder,
  realmRank,
  realmIsRegression,
  DEFAULT_REALM_LADDER,
} from "../../src/utils/realm-order.ts";

describe("parseRealmLadder", () => {
  it("returns empty array when input is null/undefined/empty", () => {
    expect(parseRealmLadder(null)).toEqual([]);
    expect(parseRealmLadder(undefined)).toEqual([]);
    expect(parseRealmLadder("")).toEqual([]);
    expect(parseRealmLadder("   ")).toEqual([]);
  });

  it("parses arrow-separated realms", () => {
    const text = "Cảnh giới: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh";
    const result = parseRealmLadder(text);
    expect(result).toEqual(["luyện khí", "trúc cơ", "kim đan", "nguyên anh"]);
  });

  it("parses arrow-separated with -> syntax", () => {
    const text = "Luyện Thể -> Vũ Sư -> Vũ Vương -> Vũ Hoàng -> Vũ Đế";
    const result = parseRealmLadder(text);
    expect(result).toEqual([
      "luyện thể",
      "vũ sư",
      "vũ vương",
      "vũ hoàng",
      "vũ đế",
    ]);
  });

  it("parses numbered list", () => {
    const text = `Hệ thống cảnh giới tu tiên:
1. Luyện Khí
2. Trúc Cơ
3. Kim Đan
4. Nguyên Anh
5. Hóa Thần`;
    const result = parseRealmLadder(text);
    expect(result).toEqual([
      "luyện khí",
      "trúc cơ",
      "kim đan",
      "nguyên anh",
      "hóa thần",
    ]);
  });

  it("parses numbered list with descriptions after colon", () => {
    const text = `1. Luyện Khí: hấp thu linh khí
2. Trúc Cơ: xây nền đạo cơ
3. Kim Đan: ngưng tụ kim đan`;
    const result = parseRealmLadder(text);
    expect(result).toEqual(["luyện khí", "trúc cơ", "kim đan"]);
  });

  it("parses bullet list", () => {
    const text = `Cảnh giới:
- Phàm Nhân
- Luyện Khí
- Trúc Cơ
- Kim Đan`;
    const result = parseRealmLadder(text);
    expect(result).toEqual(["phàm nhân", "luyện khí", "trúc cơ", "kim đan"]);
  });

  it("returns empty for unparseable text", () => {
    const text = "Tu luyện rất khó, cần nhiều năm mới tiến bộ.";
    const result = parseRealmLadder(text);
    expect(result).toEqual([]);
  });

  it("picks longest arrow chain when multiple lines have arrows", () => {
    const text = `Giới thiệu: A → B
Cảnh giới đầy đủ: Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh`;
    const result = parseRealmLadder(text);
    expect(result).toEqual([
      "phàm nhân",
      "luyện khí",
      "trúc cơ",
      "kim đan",
      "nguyên anh",
    ]);
  });
});

describe("realmRank", () => {
  it("returns index for known realm", () => {
    expect(realmRank("kim đan", DEFAULT_REALM_LADDER)).toBe(3);
  });

  it("returns -1 for unknown realm", () => {
    expect(realmRank("vũ đế", DEFAULT_REALM_LADDER)).toBe(-1);
  });

  it("returns -1 for null/undefined", () => {
    expect(realmRank(null, DEFAULT_REALM_LADDER)).toBe(-1);
    expect(realmRank(undefined, DEFAULT_REALM_LADDER)).toBe(-1);
  });

  it("uses substring matching", () => {
    expect(realmRank("Kim Đan kỳ", DEFAULT_REALM_LADDER)).toBe(3);
  });

  it("works with custom ladder", () => {
    const ladder = ["vũ sư", "vũ vương", "vũ đế"];
    expect(realmRank("vũ vương", ladder)).toBe(1);
  });
});

describe("realmIsRegression", () => {
  it("detects regression", () => {
    expect(
      realmIsRegression("kim đan", "luyện khí", DEFAULT_REALM_LADDER),
    ).toBe(true);
  });

  it("allows progression", () => {
    expect(
      realmIsRegression("luyện khí", "kim đan", DEFAULT_REALM_LADDER),
    ).toBe(false);
  });

  it("returns false for unknown realms", () => {
    expect(realmIsRegression("vũ đế", "kim đan", DEFAULT_REALM_LADDER)).toBe(
      false,
    );
    expect(realmIsRegression("kim đan", "vũ đế", DEFAULT_REALM_LADDER)).toBe(
      false,
    );
  });

  it("returns false for same realm", () => {
    expect(realmIsRegression("kim đan", "kim đan", DEFAULT_REALM_LADDER)).toBe(
      false,
    );
  });

  it("works with custom ladder", () => {
    const ladder = ["luyện thể", "vũ sư", "vũ vương", "vũ hoàng", "vũ đế"];
    expect(realmIsRegression("vũ vương", "vũ sư", ladder)).toBe(true);
    expect(realmIsRegression("vũ sư", "vũ vương", ladder)).toBe(false);
  });
});
