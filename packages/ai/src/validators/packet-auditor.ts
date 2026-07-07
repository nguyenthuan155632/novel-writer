import { GENERATION_CONFIG, type GenreFamily } from "@novel/core";
import type { ChapterPacket } from "../schemas/packet.ts";
import { realmRank as getRealmRank } from "../utils/realm-order.ts";
import { parseForbiddenRules, MUTATION_VERBS } from "./utils.ts";

/** Codes that force immediate regeneration regardless of severity. */
export const MANDATORY_REGEN_CODES = new Set([
  "locked_fact",
  "dead_character",
  "future_turning_point",
  "purpose_ending_mismatch",
  "realm_jump_excess",
]);

export type AuditInput = {
  packet: ChapterPacket;
  characters: { name: string; status: string; currentRealm?: string }[];
  forbiddenRules: string;
  duePlantedSeeds: { id: string; seedText: string; plantWindowEnd: number }[];
  overdueTurningPoints?: string[];
  futureTurningPoints?: string[];
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

  // --- Missing conflict (structural, not cosmetic). Cliffhanger is intentionally optional for long-form pacing. ---
  if (!input.packet.conflict || input.packet.conflict.trim().length < 8) {
    issues.push({
      code: "missing_conflict",
      severity: "high",
      message: "Packet thiếu conflict rõ ràng.",
    });
  }

  // --- Purpose/ending semantic consistency ---
  const chapterPurpose = normalizeVietnameseForMatch(input.packet.chapterPurpose ?? "");
  const endingMode = normalizeVietnameseForMatch(input.packet.endingMode ?? "");
  if (
    isQuietPurpose(chapterPurpose, endingMode) &&
    hasActiveInvestigationEscalation(input.packet)
  ) {
    issues.push({
      code: "purpose_ending_mismatch",
      severity: "high",
      message:
        "Packet khai báo slice/quiet nhưng lại đưa cảnh rình rập, tự điều tra ban đêm, bóng người biến mất, hoặc địa điểm nguy hiểm vào requiredEvents.",
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

  // --- Future turning point boundary check ---
  if (input.futureTurningPoints && input.futureTurningPoints.length > 0) {
    const packetText = normalizeVietnameseForMatch(
      [
        input.packet.goal,
        input.packet.conflict,
        input.packet.cliffhanger ?? "",
        ...input.packet.requiredEvents.map((e) => e.description),
      ].join(" "),
    );

    for (const turningPoint of input.futureTurningPoints) {
      const plannedChapter = extractPlannedChapter(turningPoint);
      if (plannedChapter == null || plannedChapter <= input.packet.chapterNumber) continue;
      const anchor = futureTurningPointAnchor(turningPoint);
      if (!anchor) continue;
      const normalizedAnchor = normalizeVietnameseForMatch(anchor);
      if (normalizedAnchor.length >= 4 && packetText.includes(normalizedAnchor)) {
        issues.push({
          code: "future_turning_point",
          severity: "high",
          message: `Packet kéo turning point tương lai "${anchor}" vào chương ${input.packet.chapterNumber} trước mốc chương ${plannedChapter}.`,
        });
      }
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

function extractPlannedChapter(text: string): number | null {
  const match = text.match(/\(chương\s*(\d+)\)/iu);
  if (!match?.[1]) return null;
  const chapter = Number(match[1]);
  return Number.isFinite(chapter) ? chapter : null;
}

function futureTurningPointAnchor(text: string): string | null {
  const normalized = text
    .replace(/\s*\(chương\s*\d+\)\s*/iu, "")
    .replace(/\s*[-:–—]\s*.*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const patterns = [
    /^gặp\s+(.+)$/iu,
    /^tìm\s+thấy\s+(.+?)(?:\s+trong|\s+ở|$)/iu,
    /^bước\s+chân\s+xuống\s+(.+)$/iu,
    /^mở\s+(.+)$/iu,
    /^giải\s+mã\s+(.+)$/iu,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const anchor = match?.[1]?.trim();
    if (anchor) return anchor;
  }

  return null;
}

function normalizeVietnameseForMatch(value: string): string {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuietPurpose(chapterPurpose: string, endingMode: string): boolean {
  return (
    chapterPurpose.includes("slice_of_life") ||
    chapterPurpose.includes("slice of life") ||
    chapterPurpose.includes("aftermath") ||
    chapterPurpose.includes("relationship") ||
    chapterPurpose.includes("worldbuilding") ||
    endingMode.includes("quiet_transition") ||
    endingMode.includes("quiet transition") ||
    endingMode.includes("emotional_aftertaste") ||
    endingMode.includes("emotional aftertaste") ||
    endingMode.includes("resolved")
  );
}

function hasActiveInvestigationEscalation(packet: ChapterPacket): boolean {
  const plain = normalizeVietnameseForMatch(
    [
      packet.goal,
      packet.conflict,
      packet.cliffhanger ?? "",
      ...packet.requiredEvents.map((e) => e.description),
    ].join(" "),
  );

  const activeInvestigation =
    /\b(rinh|theo doi|quan sat|canh gac|mai phuc|dot nhap|lan vao|tu minh ra|di dem|ban dem|dem khuya|canh ba)\b/u.test(
      plain,
    );
  const threatOrSecretLocation =
    /\b(bong nguoi|ao den|bien mat|mieu hoang|am binh|vat chung|dau vet|mau kho|ngan bi mat|tai lieu cu)\b/u.test(
      plain,
    );

  return activeInvestigation && threatOrSecretLocation;
}
