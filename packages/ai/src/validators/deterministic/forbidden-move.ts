import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';
import { parseForbiddenRules } from '../utils.ts';

export function makeForbiddenMoveCheck(rulesText: string): DeterministicCheck {
  const keywords = parseForbiddenRules(rulesText);

  return {
    id: 'forbidden_move',
    severity: 'critical',
    run(input: CheckInput): CheckResult {
      const issues: string[] = [];
      const lower = input.content.toLowerCase();
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          issues.push(`Vi phạm forbidden rule: "${keyword}".`);
        }
      }
      return { pass: issues.length === 0, issues };
    },
  };
}