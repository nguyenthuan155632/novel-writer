/**
 * Shared utility for power-level / realm ordering.
 *
 * Works for any genre with a progression system (cultivation, martial, ability,
 * system, etc.). The structured `realm_ladder` from the bible is preferred;
 * `parseRealmLadder()` is a heuristic fallback for legacy cultivation_system text.
 *
 * DEFAULT_REALM_LADDER is kept only for backward-compat with old cultivation
 * stories that have no structured ladder AND no parseable cultivation_system.
 */

/**
 * Default xianxia realm ladder — used as fallback when a story has no
 * cultivationSystem defined in its bible.
 */
export const DEFAULT_REALM_LADDER: readonly string[] = [
  "phàm nhân",
  "luyện khí",
  "trúc cơ",
  "kim đan",
  "nguyên anh",
  "hóa thần",
  "luyện hư",
  "hợp thể",
  "đại thừa",
  "độ kiếp",
];

/**
 * Parse a cultivationSystem / power_system text block into an ordered list of
 * realm/level names, lowest to highest.
 *
 * Heuristics:
 * 1. Look for arrow-separated items (e.g. "Luyện Khí → Trúc Cơ → Kim Đan")
 * 2. Look for numbered list items (e.g. "1. Luyện Khí", "2. Trúc Cơ")
 * 3. Look for lines starting with "- " or "• " as bullet lists
 *
 * Returns `[]` (empty) if input is null/empty or parsing yields fewer than 2
 * entries. Callers decide their own fallback strategy.
 */
export function parseRealmLadder(
  cultivationSystemText?: string | null,
): string[] {
  if (!cultivationSystemText || cultivationSystemText.trim().length === 0) {
    return [];
  }

  const text = cultivationSystemText.trim();

  // Strategy 1: Arrow-separated (→, ->, ➜, ➔, =>, ⇒)
  const arrowPattern = /[→➜➔⇒]|->|=>/;
  if (arrowPattern.test(text)) {
    // Find the longest line containing arrows
    const lines = text.split("\n");
    let bestLine = "";
    let bestCount = 0;
    for (const line of lines) {
      const parts = line
        .split(arrowPattern)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (parts.length > bestCount) {
        bestCount = parts.length;
        bestLine = line;
      }
    }
    if (bestCount >= 2) {
      const realms = bestLine
        .split(arrowPattern)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
      // Strip label prefix from first item (e.g. "cảnh giới: luyện khí" → "luyện khí")
      if (realms.length >= 2 && realms[0]!.includes(":")) {
        const afterColon = realms[0]!
          .slice(realms[0]!.lastIndexOf(":") + 1)
          .trim();
        if (afterColon.length > 0) {
          realms[0] = afterColon;
        }
      }
      if (realms.length >= 2) return realms;
    }
  }

  // Strategy 2: Numbered list (1. Xxx, 2. Yyy, ...)
  const numberedPattern = /^\s*(\d+)[.)]\s*(.+)/;
  const numberedItems: { num: number; text: string }[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(numberedPattern);
    if (m) {
      numberedItems.push({
        num: parseInt(m[1]!, 10),
        text: m[2]!.trim().toLowerCase(),
      });
    }
  }
  if (numberedItems.length >= 2) {
    numberedItems.sort((a, b) => a.num - b.num);
    // Extract just the realm name (first segment before colon/dash description)
    return numberedItems.map((item) => {
      const colonIdx = item.text.indexOf(":");
      const dashIdx = item.text.indexOf(" - ");
      const parenIdx = item.text.indexOf("(");
      const cutPoints = [colonIdx, dashIdx, parenIdx].filter((i) => i > 0);
      if (cutPoints.length > 0) {
        return item.text.slice(0, Math.min(...cutPoints)).trim();
      }
      return item.text;
    });
  }

  // Strategy 3: Bullet list (- Xxx, • Yyy, * Zzz)
  const bulletPattern = /^\s*[-•*]\s+(.+)/;
  const bulletItems: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(bulletPattern);
    if (m) {
      const raw = m[1]!.trim().toLowerCase();
      const colonIdx = raw.indexOf(":");
      const dashIdx = raw.indexOf(" - ");
      const parenIdx = raw.indexOf("(");
      const cutPoints = [colonIdx, dashIdx, parenIdx].filter((i) => i > 0);
      if (cutPoints.length > 0) {
        bulletItems.push(raw.slice(0, Math.min(...cutPoints)).trim());
      } else {
        bulletItems.push(raw);
      }
    }
  }
  if (bulletItems.length >= 2) {
    return bulletItems;
  }

  // Could not parse any structured list
  return [];
}

/**
 * Get the rank (0-based index) of a realm name within a ladder.
 * Returns -1 if not found (uses substring matching for flexibility).
 */
export function realmRank(
  realm: string | undefined | null,
  ladder: readonly string[],
): number {
  if (!realm) return -1;
  const lower = realm.toLowerCase();
  return ladder.findIndex((x) => lower.includes(x));
}

/**
 * Check whether a proposed realm change represents a regression (going backward
 * in the cultivation ladder).
 *
 * Returns false if either realm is not found in the ladder (unknown realms
 * cannot be validated).
 */
export function realmIsRegression(
  current: string,
  proposed: string,
  ladder: readonly string[],
): boolean {
  const currentRank = realmRank(current, ladder);
  const proposedRank = realmRank(proposed, ladder);
  if (currentRank < 0 || proposedRank < 0) return false;
  return proposedRank < currentRank;
}
