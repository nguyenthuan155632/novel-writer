import { GENERATION_CONFIG } from "@novel/core";
import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

export const realmJumpCheck: DeterministicCheck = {
  id: "realm_jump",
  // 'high' not 'critical': detection is word-count based (heuristic), false positives
  // from enemy breakthroughs or flashbacks are possible — don't short-circuit the pipeline.
  severity: "high",
  run(input: CheckInput): CheckResult {
    const matches = input.content.match(
      /đột phá|breakthrough|thăng cấp|lên cảnh giới/gi,
    );
    const jumpCount = matches ? matches.length : 0;

    if (jumpCount <= GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
      return { pass: true, issues: [] };
    }

    const culprits = Object.entries(input.canon.realmByCharacter)
      .filter(([, realm]) => !!realm)
      .map(([name]) => `"${name}"`);

    const who = culprits.length > 0 ? ` (${culprits.join(", ")})` : "";
    return {
      pass: false,
      issues: [
        `Phát hiện ${jumpCount} lần đột phá trong 1 chương${who} — tối đa ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}.`,
      ],
    };
  },
};
