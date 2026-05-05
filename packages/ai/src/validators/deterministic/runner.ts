import type { GenreFamily } from "@novel/core";
import type {
  CheckInput,
  CheckResult,
  DeterministicCheck,
  PendingVerificationItem,
  Severity,
} from "./types.ts";
import { wordCountCheck } from "./word-count.ts";
import { deadCharacterCheck } from "./dead-character.ts";
import { realmJumpCheck } from "./realm-jump.ts";
import { lockedFactCheck } from "./locked-fact.ts";
import { makeForbiddenMoveCheck } from "./forbidden-move.ts";
import { unknownCharacterCheck } from "./unknown-character.ts";
import { unknownLocationCheck } from "./unknown-location.ts";
import { unknownFactionCheck } from "./unknown-faction.ts";
import { newBloodlineSourceCheck } from "./new-bloodline-source.ts";
// cliffhanger, conflict-presence, style-red-flags, repetition checks retired from deterministic runner.
// Coverage migrated to llm-validator.v2.ts (criteria 8–12). Source files kept for one phase.

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function buildChecks(
  forbiddenRulesText: string,
  genreFamily: GenreFamily,
): DeterministicCheck[] {
  const isCultivation = genreFamily === "cultivation";

  const allChecks: DeterministicCheck[] = [
    deadCharacterCheck,
    ...(isCultivation ? [realmJumpCheck, newBloodlineSourceCheck] : []),
    lockedFactCheck,
    makeForbiddenMoveCheck(forbiddenRulesText),
    wordCountCheck,
    unknownCharacterCheck,
    unknownLocationCheck,
    unknownFactionCheck,
  ];

  return allChecks.sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

export type DeterministicValidatorResult = {
  pass: boolean;
  checks: {
    id: string;
    severity: Severity;
    pass: boolean;
    issues: string[];
  }[];
  shortCircuited: boolean;
  /** Issues from llmVerifiable checks that need LLM confirmation before counting as failures */
  pendingVerification: PendingVerificationItem[];
};

/**
 * Extract snippet(s) from content around a flagged entity.
 * For issues with a quoted entity (unknown_character/location): returns ~100 chars around first occurrence.
 * For keyword-count issues (realm_jump): returns multiple match contexts joined together.
 */
function extractSnippet(content: string, issue: string): string {
  // Try to extract quoted entity from issue text — handles both straight and curly quotes
  const quoted = issue.match(/["\u201c]([^"\u201d]+)["\u201d]/);
  if (quoted) {
    const entity = quoted[1]!;
    const idx = content.indexOf(entity);
    if (idx >= 0) {
      const start = Math.max(0, idx - 50);
      const end = Math.min(content.length, idx + entity.length + 50);
      return content.slice(start, end);
    }
  }

  // For realm_jump or similar: find keyword occurrences and show a few in context
  const keywords = ["đột phá", "breakthrough", "thăng cấp", "lên cảnh giới"];
  const snippets: string[] = [];
  for (const kw of keywords) {
    let searchFrom = 0;
    while (snippets.length < 5) {
      const idx = content.toLowerCase().indexOf(kw, searchFrom);
      if (idx < 0) break;
      const start = Math.max(0, idx - 30);
      const end = Math.min(content.length, idx + kw.length + 30);
      snippets.push(content.slice(start, end));
      searchFrom = idx + kw.length;
    }
    if (snippets.length >= 5) break;
  }
  if (snippets.length > 0) {
    return snippets.map((s, i) => `[${i + 1}] ...${s}...`).join("\n");
  }

  // Final fallback
  return content.slice(0, 150);
}

export function runDeterministicValidator(
  input: CheckInput,
  checks: DeterministicCheck[],
): DeterministicValidatorResult {
  const results: DeterministicValidatorResult["checks"] = [];
  const pendingVerification: PendingVerificationItem[] = [];
  let overallPass = true;
  let shortCircuited = false;

  for (const check of checks) {
    const result: CheckResult = check.run(input);

    if (!result.pass && check.llmVerifiable) {
      // Don't fail immediately — queue for LLM verification
      results.push({
        id: check.id,
        severity: check.severity,
        pass: true, // tentative — will be updated after LLM verification
        issues: [],
      });
      for (const issue of result.issues) {
        const snippet = extractSnippet(input.content, issue);
        pendingVerification.push({
          checkId: check.id,
          severity: check.severity,
          issue,
          snippet,
        });
      }
    } else {
      results.push({
        id: check.id,
        severity: check.severity,
        pass: result.pass,
        issues: result.issues,
      });

      if (!result.pass) {
        overallPass = false;
        if (check.severity === "critical") {
          shortCircuited = true;
          break;
        }
      }
    }
  }

  return {
    pass: overallPass,
    checks: results,
    shortCircuited,
    pendingVerification,
  };
}
