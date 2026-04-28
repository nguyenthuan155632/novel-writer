import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const deadCharacterCheck: DeterministicCheck = {
  id: 'dead_character',
  severity: 'critical',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content;
    for (const name of input.canon.deadCharacterNames) {
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
      if (regex.test(content)) {
        issues.push(`Nhân vật "${name}" đã chết nhưng vẫn xuất hiện trong chương.`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}