import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const lockedFactCheck: DeterministicCheck = {
  id: 'locked_fact',
  severity: 'critical',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    for (const { topic, fact } of input.canon.lockedFacts) {
      if (!topic) continue;
      if (input.content.includes(topic) && !input.content.includes(fact)) {
        issues.push(`Topic "${topic}" được nhắc nhưng không tuân locked fact: "${fact}".`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};