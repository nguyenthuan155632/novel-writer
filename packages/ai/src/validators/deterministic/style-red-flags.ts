import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

const STYLE_RED_FLAGS = [
  /\bding\b/i,
  /\bsystem notified\b/i,
  /\bleveled up\b/i,
  /\bsuddenly, everyone\b/i,
  /\bông nội\b.*?\bông ngoại\b.*?\bcha\b.*?\bmẹ\b/,
];

const VIETNAMESE_RED_FLAGS = [
  /hệ thống thông báo/i,
  /ding/i,
  /nâng cấp hệ thống/i,
  /tất cả mọi người đều khiếp sợ/i,
  /tất cả ai cũng/i,
  /không ai có thể tin được/i,
];

// Bắt pattern viết tắt tên nhân vật kiểu "LTS", "TCT", "NH" (2-4 chữ cái Latin hoa liên tiếp)
// Loại trừ các từ viết tắt thông dụng hợp lệ không phải tên người
const VALID_NON_NAME_ABBREVIATIONS = new Set([
  "OK",
  "VD",
  "VN",
  "HN",
  "TP",
  "TQ",
  "NV",
  "ND",
  "TV",
  "BT",
  "ĐN",
  // Onomatopoeia / sound effects
  "BOOM",
  "BANG",
  "CRACK",
  "THUD",
  "ROAR",
  "SNAP",
  "SLAM",
  "WHAM",
  "RẦM",
  "BỐP",
  "SẦM",
]);

const NAME_ABBREVIATION_PATTERN = /\b([A-Z]{2,4})\b/g;

export const styleRedFlagsCheck: DeterministicCheck = {
  id: "style_red_flags",
  severity: "medium",
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content;

    for (const pattern of STYLE_RED_FLAGS) {
      if (pattern.test(content)) {
        issues.push(`Phát hiện red-flag style: pattern "${pattern.source}".`);
      }
    }

    for (const pattern of VIETNAMESE_RED_FLAGS) {
      if (pattern.test(content)) {
        issues.push(
          `Phát hiện red-flag style tiếng Việt: pattern "${pattern.source}".`,
        );
      }
    }

    // Kiểm tra viết tắt tên nhân vật (ví dụ: LTS, TCT, NH)
    // Bỏ qua dòng TITLE: và các từ viết tắt hợp lệ đã biết
    const contentWithoutTitle = content.replace(/^TITLE:.*$/m, "");
    const foundAbbreviations: string[] = [];
    let match: RegExpExecArray | null;
    NAME_ABBREVIATION_PATTERN.lastIndex = 0;
    while (
      (match = NAME_ABBREVIATION_PATTERN.exec(contentWithoutTitle)) !== null
    ) {
      const abbr = match[1]!;
      if (
        !VALID_NON_NAME_ABBREVIATIONS.has(abbr) &&
        !foundAbbreviations.includes(abbr)
      ) {
        foundAbbreviations.push(abbr);
      }
    }
    if (foundAbbreviations.length > 0) {
      issues.push(
        `Phát hiện có thể viết tắt tên nhân vật: ${foundAbbreviations.join(", ")}. Dùng tên đầy đủ hoặc danh xưng thay thế.`,
      );
    }

    return { pass: issues.length === 0, issues };
  },
};
