import { MODEL_CONFIG, estimateTokens } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { SummaryCompactorOutputSchema, SUMMARY_COMPACTOR_JSON_SCHEMA, type SummaryCompactorOutput } from '../schemas/summary.ts';
import { summaryCompactorPromptV2, type SummaryCompactorV2PromptInput } from '../prompts/summary-compactor.v2.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
}

export type SummaryCompactorDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export type SummaryCompactionResult = {
  output: SummaryCompactorOutput;
  promptVersion: string;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
};

/** §1.11 — max tokens for bible_compact / summary output. */
const SUMMARY_MAX_TOKENS = 500;
const MOOD_SHIFTS = new Set(['darker', 'lighter', 'unchanged']);

export class BibleCompactionTooLargeError extends Error {
  constructor(public readonly estimatedTokens: number) {
    super(
      `Summary still exceeds ${SUMMARY_MAX_TOKENS} tokens (estimated: ${estimatedTokens}) after second attempt. Operator review required.`,
    );
    this.name = 'BibleCompactionTooLargeError';
  }
}

async function runOnce(
  provider: LLMProvider,
  model: string,
  system: string,
  user: string,
  traceId: string,
  storyId: string,
): Promise<{ parsed: SummaryCompactorOutput; rawContent: string; usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number } }> {
  let lastResContent = '';
  let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  const rawParsed = await withCompletionRetry(
    'summary_compactor',
    async () => {
      const res = await provider.complete({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        responseSchema: SUMMARY_COMPACTOR_JSON_SCHEMA,
        temperature: 0.2,
        metadata: {
          agentRole: summaryCompactorPromptV2.agentRole,
          promptVersion: summaryCompactorPromptV2.version,
          traceId,
          storyId,
        },
      });
      lastResContent = res.content ?? '';
      lastUsage = res.usage;
      return res;
    },
    3,
  );
  const parsed = SummaryCompactorOutputSchema.parse(normalizeSummaryCompactorPayload(rawParsed));
  return { parsed, rawContent: lastResContent, usage: lastUsage };
}

function stringFromEvent(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ['event', 'description', 'summary', 'text']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

export function normalizeSummaryCompactorPayload(value: unknown): unknown {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return value;

  const payload = { ...(value as Record<string, unknown>) };
  if (Array.isArray(payload.keyEvents)) {
    payload.keyEvents = payload.keyEvents.map(stringFromEvent).filter((event): event is string => event != null);
  }

  if (typeof payload.summary !== 'string' || payload.summary.trim().length === 0) {
    for (const key of ['chapterSummary', 'summaryText', 'compactSummary']) {
      const candidate = payload[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        payload.summary = candidate.trim();
        break;
      }
    }
    if ((typeof payload.summary !== 'string' || payload.summary.trim().length === 0) && Array.isArray(payload.keyEvents)) {
      const events = payload.keyEvents.filter((event): event is string => typeof event === 'string' && event.trim().length > 0);
      if (events.length > 0) {
        payload.summary = events.join(' ');
      }
    }
  }

  if (!Array.isArray(payload.charactersPresent)) {
    payload.charactersPresent = [];
  }

  if (
    payload.moodShift == null ||
    (typeof payload.moodShift === 'string' && !MOOD_SHIFTS.has(payload.moodShift))
  ) {
    delete payload.moodShift;
  }

  return payload;
}

export class SummaryCompactor {
  constructor(private readonly deps: SummaryCompactorDeps) {}

  async compact(input: SummaryCompactorV2PromptInput, ctx: { traceId: string; storyId: string }): Promise<SummaryCompactionResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'summary_compactor' });
    const model = this.deps.model ?? MODEL_CONFIG.routes.summary_compactor;
    const built = summaryCompactorPromptV2.build(input as unknown as Record<string, unknown>);

    let result: Awaited<ReturnType<typeof runOnce>>;
    try {
      result = await runOnce(this.deps.provider, model, built.system, built.user, ctx.traceId, ctx.storyId);
    } catch (err) {
      log.error({ err }, 'summary compactor parse failed');
      throw err;
    }

    // §1.11 — token guard: ≤500 tokens
    const tokens = estimateTokens(result.parsed.summary);
    if (tokens > SUMMARY_MAX_TOKENS) {
      log.warn(
        { estimatedTokens: tokens, summaryLen: result.parsed.summary.length },
        'summary exceeds 500 tokens — retrying with stricter prompt',
      );
      const stricterUser = [
        built.user,
        '',
        `QUAN TRỌNG: Tóm tắt ở trên quá dài (ước tính ${tokens} tokens). Hãy rút gọn xuống dưới 500 tokens.`,
        'TUYỆT ĐỐI GIỮ LẠI: forbidden_rules, cultivation_system, style_guide từ Bible.',
        'Bỏ bớt chi tiết mô tả, chỉ giữ sự kiện cốt lõi.',
      ].join('\n');
      try {
        result = await runOnce(this.deps.provider, model, built.system, stricterUser, ctx.traceId, ctx.storyId);
      } catch (err) {
        log.error({ err }, 'summary compactor strict retry parse failed');
        throw err;
      }
      const tokensAfter = estimateTokens(result.parsed.summary);
      if (tokensAfter > SUMMARY_MAX_TOKENS) {
        log.error(
          { estimatedTokens: tokensAfter, severity: 'operator_alert' },
          'BibleCompactionTooLargeError: summary still exceeds 500 tokens after retry',
        );
        throw new BibleCompactionTooLargeError(tokensAfter);
      }
    }

    log.info({
      summaryLen: result.parsed.summary.length,
      events: result.parsed.keyEvents.length,
      chars: result.parsed.charactersPresent.length,
    }, 'summary compaction complete');

    return {
      output: result.parsed,
      promptVersion: summaryCompactorPromptV2.version,
      rawContent: result.rawContent,
      usage: result.usage,
    };
  }
}

export function extractTailContent(content: string, target = 250): string {
  const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);
  let tail = '';
  let words = 0;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const p = paragraphs[i];
    if (!p) continue;
    tail = p + '\n\n' + tail;
    words += p.split(/\s+/).length;
    if (words >= target) break;
  }
  return tail.trim();
}
