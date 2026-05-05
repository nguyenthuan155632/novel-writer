/**
 * Shared validator utilities.
 */

/** Directive prefixes to strip before matching forbidden rule keywords. */
const FORBIDDEN_PREFIXES = [
  // Vietnamese
  "tuyệt đối không ",
  "không cho phép ",
  "không được ",
  "không ",
  "cấm ",
  // English
  "must not ",
  "do not ",
  "don't ",
  "never ",
  "forbidden: ",
];

/**
 * Parse a forbidden-rules block into cleaned keywords.
 * Strips Vietnamese/English directive prefixes, filters short/empty lines.
 */
export function parseForbiddenRules(rulesText: string): string[] {
  return rulesText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();
      for (const prefix of FORBIDDEN_PREFIXES) {
        if (lower.startsWith(prefix)) {
          return trimmed.substring(prefix.length).trim();
        }
      }
      return trimmed;
    })
    .filter((l) => l.length > 2);
}

/**
 * Mutation verbs that signal an explicit contradiction of a locked field.
 * Both Vietnamese and English forms.
 */
export const MUTATION_VERBS = [
  // Vietnamese
  "phá hủy",
  "thay đổi",
  "nâng cấp",
  "hạ cấp",
  "xóa bỏ",
  "loại bỏ",
  "hủy diệt",
  "biến đổi",
  "sửa đổi",
  // English
  "destroy",
  "change",
  "upgrade",
  "downgrade",
  "break",
  "remove",
  "modify",
  "alter",
  "eliminate",
];
