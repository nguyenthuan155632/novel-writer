import { GENERATION_CONFIG } from '@novel/core';
import type { ChapterPacket } from '../schemas/packet.ts';

export type AuditInput = {
  packet: ChapterPacket;
  characters: { name: string; status: string; currentRealm?: string }[];
  forbiddenRules: string;
  duePlantedSeeds: { id: string; seedText: string; plantWindowEnd: number }[];
};

export type AuditIssue = {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
};

export type AuditResult = {
  pass: boolean;
  issues: AuditIssue[];
  requiresRegenerate: boolean;
};

const REALM_ORDER = [
  'phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
  'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp',
];

function realmRank(r?: string): number {
  if (!r) return -1;
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

export function auditPacket(input: AuditInput): AuditResult {
  const issues: AuditIssue[] = [];

  const charByName = new Map(input.characters.map(c => [c.name.toLowerCase(), c]));
  for (const name of input.packet.charactersPresent) {
    const c = charByName.get(name.toLowerCase());
    if (c && c.status === 'dead') {
      issues.push({ code: 'dead_character', severity: 'critical', message: `Nhân vật "${name}" đã chết theo canon nhưng có mặt trong packet.` });
    }
  }

  const eventIds = new Set(input.packet.requiredEvents.map(e => e.seedId).filter(Boolean));
  for (const seed of input.duePlantedSeeds) {
    if (input.packet.chapterNumber >= seed.plantWindowEnd && !eventIds.has(seed.id)) {
      issues.push({
        code: 'unresolved_due_seed',
        severity: seed.plantWindowEnd === input.packet.chapterNumber ? 'critical' : 'high',
        message: `Seed "${seed.seedText}" (id=${seed.id}) phải plant trước/tại ch${seed.plantWindowEnd} nhưng không xuất hiện trong requiredEvents.`,
      });
    }
  }

  if (!input.packet.conflict || input.packet.conflict.trim().length < 8) {
    issues.push({ code: 'missing_conflict', severity: 'high', message: 'Packet thiếu conflict rõ ràng.' });
  }
  if (!input.packet.cliffhanger || input.packet.cliffhanger.trim().length < 8) {
    issues.push({ code: 'missing_cliffhanger', severity: 'high', message: 'Packet thiếu cliffhanger rõ ràng.' });
  }

  for (const c of input.packet.charactersPresent) {
    const canonChar = charByName.get(c.toLowerCase());
    if (!canonChar) continue;
    const startRank = realmRank(canonChar.currentRealm);
    const breakCount = input.packet.requiredEvents.filter(e => /đột phá|breakthrough|thăng cấp/i.test(e.description)).length;
    if (breakCount > 0 && startRank >= 0 && breakCount > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
      issues.push({
        code: 'realm_jump_excess',
        severity: 'critical',
        message: `Packet đề xuất ${breakCount} đột phá trong cùng 1 chương (max ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`,
      });
    }
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasHigh = issues.some(i => i.severity === 'high');

  return {
    pass: !hasCritical && !hasHigh,
    issues,
    requiresRegenerate: hasCritical || hasHigh,
  };
}