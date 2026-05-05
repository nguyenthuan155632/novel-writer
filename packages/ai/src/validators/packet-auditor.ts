import { GENERATION_CONFIG, type GenreFamily } from "@novel/core";
import type { ChapterPacket } from "../schemas/packet.ts";
import { realmRank as getRealmRank } from "../utils/realm-order.ts";
import { parseForbiddenRules, MUTATION_VERBS } from "./utils.ts";

/** Codes that force immediate regeneration regardless of severity. */
export const MANDATORY_REGEN_CODES = new Set([
  "locked_fact",
  "dead_character",
  "realm_jump_excess",
]);

export type AuditInput = {
  packet: ChapterPacket;
  characters: { name: string; status: string; currentRealm?: string }[];
  forbiddenRules: string;
  duePlantedSeeds: { id: string; seedText: string; plantWindowEnd: number }[];
  overdueTurningPoints?: string[];
  /** Locked canon fact candidates near this packet (from retrieval, not hard embedding). */
  lockedFactCandidates?: {
    id: string;
    fact: string;
    topic: string;
    lockedFields?: string[];
  }[];
};

export type AuditCtx = {
  genreFamily: GenreFamily;
  /**
   * Ordered realm ladder for realm-jump validation.
   * Parsed from story_bibles.cultivation_system via `parseRealmLadder()`.
   * Falls back to DEFAULT_REALM_LADDER if not provided.
   */
  realmLadder?: readonly string[];
};

export type AuditIssue = {
  code: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
};

export type AuditResult = {
  pass: boolean;
  issues: AuditIssue[];
  requiresRegenerate: boolean;
};

/** Tokenise forbiddenRulesText into individual rule lines. */
function tokenizeForbiddenRules(rulesText: string): string[] {
  return parseForbiddenRules(rulesText);
}

export function auditPacket(input: AuditInput, ctx: AuditCtx): AuditResult {
  const issues: AuditIssue[] = [];
  const charByName = new Map(
    input.characters.map((c) => [c.name.toLowerCase(), c]),
  );

  // --- Dead character check ---
  for (const name of input.packet.charactersPresent) {
    const c = charByName.get(name.toLowerCase());
    if (c && c.status === "dead") {
      issues.push({
        code: "dead_character",
        severity: "critical",
        message: `Nhân vật "${name}" đã chết theo canon nhưng có mặt trong packet.`,
      });
    }
  }

  // --- Unresolved due seed check ---
  const eventIds = new Set(
    input.packet.requiredEvents.map((e) => e.seedId).filter(Boolean),
  );
  for (const seed of input.duePlantedSeeds) {
    if (
      input.packet.chapterNumber >= seed.plantWindowEnd &&
      !eventIds.has(seed.id)
    ) {
      issues.push({
        code: "unresolved_due_seed",
        severity:
          seed.plantWindowEnd === input.packet.chapterNumber
            ? "critical"
            : "high",
        message: `Seed "${seed.seedText}" (id=${seed.id}) phải plant trước/tại ch${seed.plantWindowEnd} nhưng không xuất hiện trong requiredEvents.`,
      });
    }
  }

  // --- Missing conflict / cliffhanger (structural, not cosmetic) ---
  if (!input.packet.conflict || input.packet.conflict.trim().length < 8) {
    issues.push({
      code: "missing_conflict",
      severity: "high",
      message: "Packet thiếu conflict rõ ràng.",
    });
  }
  if (!input.packet.cliffhanger || input.packet.cliffhanger.trim().length < 8) {
    issues.push({
      code: "missing_cliffhanger",
      severity: "high",
      message: "Packet thiếu cliffhanger rõ ràng.",
    });
  }

  // --- Realm jump excess check ---
  const ladder = ctx.realmLadder ?? [];
  if (ladder.length > 0) {
    // Count breakthroughs once per packet (not per character — avoids duplicate issues)
    const breakCount = input.packet.requiredEvents.filter((e) =>
      /đột phá|breakthrough|thăng cấp/i.test(e.description),
    ).length;

    if (breakCount >= GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
      // Verify at least one present character has a known realm rank (gate on canon data)
      const anyKnownCharInLadder = input.packet.charactersPresent.some((c) => {
        const canonChar = charByName.get(c.toLowerCase());
        return canonChar && getRealmRank(canonChar.currentRealm, ladder) >= 0;
      });

      if (anyKnownCharInLadder) {
        issues.push({
          code: "realm_jump_excess",
          severity: "critical",
          message: `Packet đề xuất ${breakCount} đột phá trong cùng 1 chương (max ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER - 1}).`,
        });
      }
    }
  }

  // --- Overdue turning point check ---
  if (input.overdueTurningPoints && input.overdueTurningPoints.length > 0) {
    const packetText = [
      input.packet.goal,
      input.packet.conflict,
      ...input.packet.requiredEvents.map((e) => e.description),
    ]
      .join(" ")
      .toLowerCase();

    const missedTps = input.overdueTurningPoints.filter((tp) => {
      const keywords = tp
        .toLowerCase()
        .split(/[\s,，、.。!！?？]+/)
        .filter((w) => w.length >= 3);
      return !keywords.some((kw) => packetText.includes(kw));
    });

    if (missedTps.length > 0) {
      issues.push({
        code: "overdue_turning_point",
        severity: "high",
        message: `Packet không đề cập tới turning point quá hạn: ${missedTps.map((tp) => `"${tp}"`).join("; ")}. Goal/requiredEvents phải thể hiện ít nhất 1 TP này.`,
      });
    }
  }

  // --- §1.4 Forbidden move check (packet-time, scanning packet text fields) ---
  if (input.forbiddenRules.trim().length > 0) {
    const rules = tokenizeForbiddenRules(input.forbiddenRules);
    const packetSearchText = [
      input.packet.goal,
      input.packet.conflict,
      input.packet.cliffhanger ?? "",
      ...input.packet.requiredEvents.map((e) => e.description),
      ...(input.packet.forbiddenMoves ?? []),
    ]
      .join(" ")
      .toLowerCase();

    for (const rule of rules) {
      if (packetSearchText.includes(rule.toLowerCase())) {
        issues.push({
          code: "forbidden_move",
          severity: "high",
          message: `Packet vi phạm forbidden rule: "${rule}".`,
        });
      }
    }
  }

  // --- §1.5 Locked fact candidate hints (non-blocking) ---
  if (input.lockedFactCandidates && input.lockedFactCandidates.length > 0) {
    const packetAllText = [
      input.packet.goal,
      input.packet.conflict,
      ...input.packet.requiredEvents.map((e) => e.description),
    ]
      .join(" ")
      .toLowerCase();

    for (const candidate of input.lockedFactCandidates) {
      if (!candidate.topic) continue;
      const topicLower = candidate.topic.toLowerCase();

      // Explicit contradiction: locked field name appears AND a mutation verb appears nearby.
      // We can't reliably detect contradiction from planning text alone, so we require both
      // signals before escalating to `locked_fact` (high, regen-blocking).
      // Absent-fact-sentence test is dropped — DB fact sentences never appear verbatim in packets.
      const hasExplicitContradiction =
        candidate.lockedFields &&
        candidate.lockedFields.length > 0 &&
        candidate.lockedFields.some((field) => {
          if (!packetAllText.includes(field.toLowerCase())) return false;
          return MUTATION_VERBS.some((verb) => packetAllText.includes(verb));
        });

      if (hasExplicitContradiction) {
        issues.push({
          code: "locked_fact",
          severity: "high",
          message: `Packet có thể trái với locked fact (topic: "${candidate.topic}"): "${candidate.fact}".`,
        });
      } else if (packetAllText.includes(topicLower)) {
        // Topic mentioned but no proven contradiction — hint only
        issues.push({
          code: "locked_fact_candidate",
          severity: "medium",
          message: `Packet đề cập topic có locked fact (topic: "${candidate.topic}") — cần LLM validator kiểm tra kỹ: "${candidate.fact}".`,
        });
      }
    }
  }

  const requiresRegenerate = issues.some((i) =>
    MANDATORY_REGEN_CODES.has(i.code),
  );
  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasHigh = issues.some((i) => i.severity === "high");
  return {
    pass: !hasCritical && !hasHigh,
    issues,
    requiresRegenerate,
  };
}
