import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import type { CanonMergerRow } from '../reconciliation/canon-merger.ts';
import type { CanonSnapshot } from '../reconciliation/conflict-detector.ts';

/** Conflict types that must always go to human review — no suggestion generated. */
const LOCKED_SKIP_TYPES = new Set(['locked_field']);

export interface ConflictResolverDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void };
  model?: string;
}

export interface ConflictResolverInput {
  updateRow: CanonMergerRow;
  snapshot: CanonSnapshot;
  conflictReasons: string[];
  traceId: string;
  storyId: string;
}

export type SuggestedResolution = Record<string, unknown>;

/**
 * §3.3 — Pre-resolved suggestions for conflicting canon updates.
 * Uses cheap/flash model. Skips locked-importance rows (always human review).
 */
export class ConflictResolverAgent {
  constructor(private readonly deps: ConflictResolverDeps) {}

  async suggest(input: ConflictResolverInput): Promise<SuggestedResolution | null> {
    // Locked importance → always human review, no suggestion.
    if (input.updateRow.payload.importance === 'locked') return null;

    // Rows with locked-field or locked-fact conflicts → human review only.
    const hasLockedConflict = input.conflictReasons.some((r) => LOCKED_SKIP_TYPES.has(r));
    if (hasLockedConflict) return null;

    const prompt = buildPrompt(input);
    let raw: string;
    try {
      const res = await this.deps.provider.complete({
        model: this.deps.model ?? MODEL_CONFIG.routes.conflict_resolver,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.2,
        metadata: {
          agentRole: 'conflict_resolver',
          promptVersion: 'v1',
          traceId: input.traceId,
          storyId: input.storyId,
        },
      });
      raw = res.content;
    } catch (err) {
      this.deps.logger?.warn({ err }, 'conflict-resolver LLM call failed, returning null');
      return null;
    }

    return parseSuggestion(raw);
  }
}

function buildPrompt(input: ConflictResolverInput): { system: string; user: string } {
  const system = `You are a canon conflict resolver for a xianxia novel generator.
Given a conflicting canon update and the current story snapshot, suggest a minimal resolution.
Respond ONLY with a JSON object. Examples of valid resolutions:
- {"defer_to_chapter": 15}
- {"mark_as_flashback": true}
- {"downgrade_importance": "low"}
- {"discard": true, "reason": "duplicate"}
Do not include any explanation outside the JSON.`;

  const user = `CONFLICT REASONS: ${input.conflictReasons.join(', ')}
UPDATE ROW:
${JSON.stringify(input.updateRow, null, 2)}
SNAPSHOT SUMMARY:
characters: ${input.snapshot.characters.map((c) => `${c.name}[${c.status}]`).join(', ')}
facts_count: ${input.snapshot.canonFacts.length}
threads: ${input.snapshot.threads.map((t) => `${t.title}[${t.status}]`).join(', ')}
Suggest a resolution JSON:`;

  return { system, user };
}

function parseSuggestion(raw: string): SuggestedResolution | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed === 'object' && parsed !== null) return parsed as SuggestedResolution;
    return null;
  } catch {
    return null;
  }
}
