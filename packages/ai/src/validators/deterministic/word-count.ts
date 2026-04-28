import { GENERATION_CONFIG } from '@novel/core';
import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const wordCountCheck: DeterministicCheck = {
  id: 'word_count',
  severity: 'medium',
  run(input: CheckInput): CheckResult {
    const words = input.content.split(/\s+/).filter(Boolean).length;
    const issues: string[] = [];
    if (words < GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MIN) {
      issues.push(`Chương quá ngắn: ${words} từ (tối thiểu ${GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MIN}).`);
    }
    if (words > GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MAX) {
      issues.push(`Chương quá dài: ${words} từ (tối đa ${GENERATION_CONFIG.CHAPTER_HARD_FAIL_WORDS_MAX}).`);
    }
    return { pass: issues.length === 0, issues };
  },
};