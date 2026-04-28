import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

const FORBIDDEN_PHRASE_PREFIXES = [
  'không cho phép ',
  'không được ',
  'cấm ',
  'tuyệt đối không ',
  'forbidden: ',
  'never ',
  'do not ',
  'must not ',
];

function extractKeyword(rule: string): string | null {
  const lower = rule.toLowerCase();
  for (const prefix of FORBIDDEN_PHRASE_PREFIXES) {
    if (lower.startsWith(prefix)) {
      const keyword = rule.substring(prefix.length).trim();
      if (keyword.length > 2) return keyword;
    }
  }
  return null;
}

export function makeForbiddenMoveCheck(rulesText: string): DeterministicCheck {
  const rules = rulesText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const keywordsByRule = rules.map(rule => {
    const keyword = extractKeyword(rule);
    return { rule, keyword };
  });

  return {
    id: 'forbidden_move',
    severity: 'critical',
    run(input: CheckInput): CheckResult {
      const issues: string[] = [];
      for (const { rule, keyword } of keywordsByRule) {
        if (keyword && input.content.toLowerCase().includes(keyword.toLowerCase())) {
          issues.push(`Vi phạm forbidden rule: "${rule}".`);
        } else if (!keyword && input.content.includes(rule)) {
          issues.push(`Vi phạm forbidden rule: "${rule}".`);
        }
      }
      return { pass: issues.length === 0, issues };
    },
  };
}