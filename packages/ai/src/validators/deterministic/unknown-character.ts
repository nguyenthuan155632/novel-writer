import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

export const unknownCharacterCheck: DeterministicCheck = {
  id: "unknown_character",
  severity: "medium",
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const reported = new Set<string>();

    // Build a forgiving set of "known" proper-noun phrases by combining
    // canonical character names with other canonical name sources so the
    // check does not produce false positives for items/techniques/places.
    const knownNames = new Set<string>();

    (input.canon.knownCharacterNames || []).forEach((n) =>
      knownNames.add(n.toLowerCase()),
    );
    (input.canon.knownBloodlineNames || []).forEach((n) =>
      knownNames.add(n.toLowerCase()),
    );
    (input.canon.knownLocationNames || []).forEach((n) =>
      knownNames.add(n.toLowerCase()),
    );
    (input.canon.knownFactionNames || []).forEach((n) =>
      knownNames.add(n.toLowerCase()),
    );

    (input.canon.lockedFacts || []).forEach((f) => {
      if (f.topic) knownNames.add(f.topic.toLowerCase());
      if (f.fact) knownNames.add(f.fact.toLowerCase());
    });

    // Include names that appear in the cold/hot/warm tiers which are valid
    // context for the writer: packet.charactersPresent, retrievedFacts,
    // thread titles and the bible compact.
    try {
      const pkt = input.context.cold.packet as any;
      if (pkt?.charactersPresent && Array.isArray(pkt.charactersPresent)) {
        pkt.charactersPresent.forEach((n: string) =>
          knownNames.add(String(n).toLowerCase()),
        );
      }
    } catch {}

    (input.context.cold?.retrievedFacts || []).forEach((rf) => {
      if (rf.topic) knownNames.add(rf.topic.toLowerCase());
      if (rf.fact) knownNames.add(rf.fact.toLowerCase());
    });

    (input.context.warm?.arcOpenThreads || []).forEach((t) => {
      if (t.title) knownNames.add(t.title.toLowerCase());
    });

    if (input.context.hot?.bibleCompact) {
      // Add the compact bible as a loose source (lowercased). This helps
      // avoid flagging specialized proper nouns that only live in the bible.
      knownNames.add(input.context.hot.bibleCompact.toLowerCase());
    }

    // Vietnamese proper-name heuristic: two-or-more capitalized words.
    const vietnameseNamePattern =
      /(?:[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)+)/gu;

    const characterActionAfterPattern =
      /^\s*(?:[,.;:!?…"”'»)\]]\s*)?(?:đang\s+|đã\s+|sẽ\s+|vừa\s+|liền\s+|bỗng\s+|khẽ\s+)?(?:bước|đi|chạy|đứng|ngồi|quỳ|nhìn|liếc|cười|hỏi|nói|đáp|quát|gọi|thở|gật|lắc|cau mày|nhíu mày|im lặng|rút|đưa|nắm|buông|lao|tiến|lùi|xoay|quay|ngẩng|cúi)\b/iu;
    const characterActionBeforePattern =
      /(?:\b(?:nhìn|liếc|thấy|gặp|gọi|hỏi|bảo|nói với|quát|đáp lời|đưa cho|trao cho)\s+)$/iu;

    const looksLikeCharacterMention = (match: RegExpMatchArray): boolean => {
      const idx = match.index ?? 0;
      const name = match[0]!;
      const before = input.content.slice(Math.max(0, idx - 40), idx);
      const after = input.content.slice(idx + name.length, idx + name.length + 40);

      return (
        characterActionAfterPattern.test(after) ||
        characterActionBeforePattern.test(before)
      );
    };

    const matches = input.content.matchAll(vietnameseNamePattern);
    for (const match of matches) {
      const name = match[0]!;
      const lower = name.toLowerCase();
      if (
        !knownNames.has(lower) &&
        !reported.has(lower) &&
        looksLikeCharacterMention(match)
      ) {
        reported.add(lower);
        issues.push(
          `Nhân vật "${name}" không có trong danh sách known characters.`,
        );
      }
    }

    return { pass: issues.length === 0, issues };
  },
};
