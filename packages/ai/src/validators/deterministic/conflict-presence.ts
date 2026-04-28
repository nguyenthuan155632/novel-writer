import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const conflictPresenceCheck: DeterministicCheck = {
  id: 'conflict_presence',
  severity: 'medium',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content.toLowerCase();

    const conflictKeywords = [
      'chiến', 'đánh', 'giết', 'chống', 'đối đầu', 'mâu thuẫn',
      'tranh chấp', 'xung đột', 'thù', 'nghi ngờ', 'phản bội',
      'gây sự', 'cạnh tranh', 'dằn vặt', 'khắc phục', 'quyết tâm',
    ];

    const hasConflict = conflictKeywords.some(kw => content.includes(kw));
    if (!hasConflict) {
      issues.push('Chương thiếu xung đột rõ ràng — không tìm thấy từ khóa xung đột nào.');
    }

    return { pass: issues.length === 0, issues };
  },
};