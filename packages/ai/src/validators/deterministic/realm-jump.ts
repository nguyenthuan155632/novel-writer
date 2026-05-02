import { GENERATION_CONFIG } from "@novel/core";
import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

/**
 * A single breakthrough EVENT typically generates 4-6 keyword mentions
 * (setup, the moment, confirmation, reaction, narration).
 * Only flag when keyword count suggests MORE events than allowed.
 */
const MENTIONS_PER_EVENT = 8;

export const realmJumpCheck: DeterministicCheck = {
  id: "realm_jump",
  severity: "high",
  llmVerifiable: true,
  run(input: CheckInput): CheckResult {
    const matches = input.content.match(
      /đột phá|breakthrough|thăng cấp|lên cảnh giới/gi,
    );
    const mentionCount = matches ? matches.length : 0;
    const maxMentions =
      GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER * MENTIONS_PER_EVENT;

    if (mentionCount <= maxMentions) {
      return { pass: true, issues: [] };
    }

    const estimatedEvents = Math.ceil(mentionCount / MENTIONS_PER_EVENT);
    return {
      pass: false,
      issues: [
        `Phát hiện ~${estimatedEvents} sự kiện đột phá (${mentionCount} lần nhắc) — tối đa ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER} sự kiện/chương.`,
      ],
    };
  },
};
