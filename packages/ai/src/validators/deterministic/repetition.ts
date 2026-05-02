import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

/** Common Vietnamese function-word bigrams that naturally repeat in prose */
const COMMON_BIGRAMS = new Set([
  "của hắn",
  "hắn đã",
  "không thể",
  "có thể",
  "nhưng mà",
  "cũng không",
  "vẫn còn",
  "là một",
  "một cái",
  "cái này",
  "không biết",
  "như vậy",
  "chính là",
  "có lẽ",
  "rốt cuộc",
  "của mình",
  "trên người",
  "trong lòng",
  "vào lúc",
  "lúc này",
  "không có",
  "rất nhiều",
  "căn phòng",
  "này là",
  "đã có",
  "cũng là",
  "lại là",
  "thật sự",
  "chỉ là",
  "cho hắn",
]);

export const repetitionCheck: DeterministicCheck = {
  id: "repetition",
  severity: "low",
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const sentences = input.content
      .split(/[.!?。！？]+/)
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
      // Require 30+ chars and filter out dialogue tags (start with quote or end with nói/hỏi/đáp)
      .filter(
        (s) =>
          s.length > 30 &&
          !/^[""«']/.test(s) &&
          !/\b(?:hỏi|nói|đáp|quát|gọi)$/.test(s),
      );

    const seen = new Map<string, number>();
    for (const s of sentences) {
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }

    for (const [s, count] of seen) {
      if (count > 2) {
        issues.push(
          `Câu lặp lại ${count} lần: "${s.substring(0, 60)}${s.length > 60 ? "..." : ""}".`,
        );
      }
    }

    const bigrams = new Map<string, number>();
    for (const s of sentences) {
      const words = s.split(" ");
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (COMMON_BIGRAMS.has(bigram)) continue;
        bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
      }
    }

    const repeatedBigrams = Array.from(bigrams.entries()).filter(
      ([, c]) => c > 4,
    );
    if (repeatedBigrams.length > 20) {
      issues.push(
        `Quá nhiều cụm từ lặp: ${repeatedBigrams.length} bigrams lặp >4 lần.`,
      );
    }

    return { pass: issues.length === 0, issues };
  },
};
