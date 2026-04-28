import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

const STYLE_RED_FLAGS = [
  /\bding\b/i,
  /\bsystem notified\b/i,
  /\bleveled up\b/i,
  /\bsuddenly, everyone\b/i,
  /\bông nội\b.*?\bông ngoại\b.*?\bcha\b.*?\bmẹ\b/,
];

const VIETNAMESE_RED_FLAGS = [
  /hệ thống thông báo/i,
  /ding/i,
  /nâng cấp hệ thống/i,
  /tất cả mọi người đều khiếp sợ/i,
  /tất cả ai cũng/i,
  /không ai có thể tin được/i,
];

export const styleRedFlagsCheck: DeterministicCheck = {
  id: 'style_red_flags',
  severity: 'medium',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content;

    for (const pattern of STYLE_RED_FLAGS) {
      if (pattern.test(content)) {
        issues.push(`Phát hiện red-flag style: pattern "${pattern.source}".`);
      }
    }

    for (const pattern of VIETNAMESE_RED_FLAGS) {
      if (pattern.test(content)) {
        issues.push(`Phát hiện red-flag style tiếng Việt: pattern "${pattern.source}".`);
      }
    }

    return { pass: issues.length === 0, issues };
  },
};