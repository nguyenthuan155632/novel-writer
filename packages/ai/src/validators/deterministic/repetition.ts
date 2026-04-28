import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const repetitionCheck: DeterministicCheck = {
  id: 'repetition',
  severity: 'low',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const sentences = input.content.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);

    const normalized = sentences.map(s => s.trim().toLowerCase().replace(/\s+/g, ' '));
    const seen = new Map<string, number>();
    for (const s of normalized) {
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }

    for (const [s, count] of seen) {
      if (count > 1) {
        issues.push(`Câu lặp lại ${count} lần: "${s.substring(0, 60)}${s.length > 60 ? '...' : ''}".`);
      }
    }

    const bigrams = new Map<string, number>();
    for (const s of normalized) {
      const words = s.split(' ');
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
      }
    }

    const totalBigrams = Array.from(bigrams.values()).reduce((a, b) => a + b, 0);
    if (totalBigrams > 0) {
      const repeatedBigrams = Array.from(bigrams.entries()).filter(([, c]) => c > 3);
      if (repeatedBigrams.length > 10) {
        issues.push(`Quá nhiều cụm từ lặp: ${repeatedBigrams.length} bigrams lặp >3 lần.`);
      }
    }

    return { pass: issues.length === 0, issues };
  },
};