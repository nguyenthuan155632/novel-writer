import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

/**
 * Flags proper-noun phrases that look like a faction reference (preceded by
 * common Vietnamese faction prefixes such as `môn phái`, `gia tộc`, `tông
 * môn`, `liên minh`, `vương triều`, `đế quốc`, etc.) but are not present in
 * the canonical `factions` list.
 *
 * Severity is low: brand-new factions are normal mid-saga, but they should at
 * least pass through canon-extractor / pending-updates so we know about them.
 */
export const unknownFactionCheck: DeterministicCheck = {
  id: "unknown_faction",
  severity: "low",
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const reported = new Set<string>();

    const knownFactions = new Set(
      (input.canon.knownFactionNames ?? []).map((n) => n.toLowerCase()),
    );
    const knownCharacters = new Set(
      (input.canon.knownCharacterNames ?? []).map((n) => n.toLowerCase()),
    );
    const knownBloodlines = new Set(
      (input.canon.knownBloodlineNames ?? []).map((n) => n.toLowerCase()),
    );
    const knownLocations = new Set(
      (input.canon.knownLocationNames ?? []).map((n) => n.toLowerCase()),
    );

    // Faction-introducing prefixes — kept narrow to keep the false-positive
    // rate below that of unknown-location (which uses single prepositions).
    const factionPrefixes = [
      "môn phái",
      "tông môn",
      "tông phái",
      "gia tộc",
      "thế gia",
      "thị tộc",
      "liên minh",
      "liên bang",
      "vương triều",
      "đế quốc",
      "hoàng triều",
      "tà phái",
      "chính phái",
      "hắc đạo",
      "bạch đạo",
      "thương hội",
      "sơn trại",
      "thánh địa",
      "tiên môn",
      "ma môn",
      "yêu tộc",
      "ma tộc",
      "thần tộc",
      "tiên triều",
      "vương quốc",
      "bộ lạc",
      "bộ tộc",
      "thần điện",
      "cấm địa",
      "thánh tông",
      "ma tông",
      "kiếm phái",
      "đạo quán",
      "học viện",
      "võ quán",
      "thương minh",
      "dong binh đoàn",
      "sát thủ các",
      "cổ tộc",
      "hoàng tộc",
      "bang phái",
      "giáo phái",
      "thần giáo",
      "ma giáo",
      "đạo thống",
      "đạo tràng",
      "cung",
      "điện",
      "các",
      "lâu",
      "sơn trang",
      "cốc",
      "đảo",
      "động phủ",
      // Hiện đại / Đô thị / Khoa học viễn tưởng
      "tập đoàn",
      "công ty",
      "doanh nghiệp",
      "xí nghiệp",
      "tổng công ty",
      "tổ chức",
      "cơ quan",
      "hiệp hội",
      "liên hiệp",
      "hội đồng",
      "ủy ban",
      "viện",
      "viện nghiên cứu",
      "trung tâm",
      "cục",
      "bộ",
      "sở",
      "phòng",
      "quân đoàn",
      "hạm đội",
      "lữ đoàn",
      "tiểu đoàn",
      "quân khu",
      "băng đảng",
      "băng nhóm",
      "hắc bang",
      "xã đoàn",
      "câu lạc bộ",
      "quỹ",
      "cảnh cục",
      "sở cảnh sát",
    ];

    // Suffixes often found inside the proper noun (e.g., "Thiên Kiếm Tông")
    // or immediately after it (e.g., "Thiên Kiếm tông").
    const factionSuffixes = [
      "tông",
      "phái",
      "môn",
      "bang",
      "giáo",
      "cốc",
      "các",
      "lâu",
      "điện",
      "cung",
      "đảo",
      "trại",
      "tộc",
      "hội",
      "minh",
      "đoàn",
      "viện",
      "quốc",
      "triều",
      "đường",
      "môn phiệt",
      "thương hội",
      "tập đoàn",
      "công ty",
    ];

    const vietnameseNamePattern =
      /(?:[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)+)/gu;

    const matches = input.content.matchAll(vietnameseNamePattern);
    for (const match of matches) {
      const name = match[0]!;
      const lower = name.toLowerCase();
      if (
        knownFactions.has(lower) ||
        knownCharacters.has(lower) ||
        knownBloodlines.has(lower) ||
        knownLocations.has(lower) ||
        reported.has(lower)
      ) {
        continue;
      }
      const idx = match.index ?? 0;
      const before = input.content
        .substring(Math.max(0, idx - 24), idx)
        .toLowerCase();
      const after = input.content
        .substring(idx + name.length, idx + name.length + 24)
        .toLowerCase();

      const hasPrefixMatch = factionPrefixes.some(
        (p) => before.endsWith(p) || before.endsWith(p + " "),
      );

      // Check if the capitalized name itself ends with a faction suffix (e.g., "Thiên Kiếm Tông")
      const hasSuffixInside = factionSuffixes.some((s) =>
        lower.endsWith(" " + s),
      );

      // Check if the text immediately following the name starts with a faction suffix (e.g., "Thiên Kiếm tông")
      const hasSuffixAfter = factionSuffixes.some(
        (s) =>
          after.startsWith(" " + s + " ") ||
          after.startsWith(" " + s + ",") ||
          after.startsWith(" " + s + ".") ||
          after.startsWith(" " + s + "\n") ||
          after === " " + s,
      );

      if (hasPrefixMatch || hasSuffixInside || hasSuffixAfter) {
        reported.add(lower);
        issues.push(
          `Phái/tổ chức "${name}" không nằm trong danh sách known factions.`,
        );
      }
    }

    return { pass: issues.length === 0, issues };
  },
};
