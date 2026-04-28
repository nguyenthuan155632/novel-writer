import { GENERATION_CONFIG } from '@novel/core';
import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

const REALM_ORDER = [
  'phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
  'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp',
];

function realmRank(r?: string): number {
  if (!r) return -1;
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

export const realmJumpCheck: DeterministicCheck = {
  id: 'realm_jump',
  severity: 'critical',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const breakthroughPattern = /đột phá|breakthrough|thăng cấp|lên cảnh giới/i;
    const matches = input.content.match(new RegExp(breakthroughPattern.source, 'gi'));
    const jumpCount = matches ? matches.length : 0;

    for (const [charName, realm] of Object.entries(input.canon.realmByCharacter)) {
      if (realm && jumpCount > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
        const rank = realmRank(realm);
        if (rank >= 0 && jumpCount > 1) {
          issues.push(`Nhân vật "${charName}" ở cảnh giới "${realm}" có ${jumpCount} lần đột phá trong 1 chương (tối đa ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`);
        }
      }
    }

    if (issues.length === 0 && jumpCount > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
      issues.push(`Phát hiện ${jumpCount} lần đột phá trong 1 chương (tối đa ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`);
    }

    return { pass: issues.length === 0, issues };
  },
};