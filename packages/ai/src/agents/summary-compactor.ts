import { MODEL_CONFIG } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { SummaryCompactorOutputSchema, SUMMARY_COMPACTOR_JSON_SCHEMA, type SummaryCompactorOutput } from '../schemas/summary.ts';
import { summaryCompactorPromptV2, type SummaryCompactorV2PromptInput } from '../prompts/summary-compactor.v2.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
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

export class SummaryCompactor {
  constructor(private readonly deps: SummaryCompactorDeps) {}

  async compact(input: SummaryCompactorV2PromptInput, ctx: { traceId: string; storyId: string }): Promise<SummaryCompactionResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'summary_compactor' });
    const built = summaryCompactorPromptV2.build(input as unknown as Record<string, unknown>);

    let lastResContent = '';
    let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    let parsed: SummaryCompactorOutput;
    try {
      parsed = SummaryCompactorOutputSchema.parse(
        await withCompletionRetry(
          'summary_compactor',
          async () => {
            const res = await this.deps.provider.complete({
              model: this.deps.model ?? MODEL_CONFIG.routes.summary_compactor,
              messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
              responseSchema: SUMMARY_COMPACTOR_JSON_SCHEMA,
              temperature: 0.2,
              metadata: {
                agentRole: summaryCompactorPromptV2.agentRole,
                promptVersion: summaryCompactorPromptV2.version,
                traceId: ctx.traceId,
                storyId: ctx.storyId,
              },
            });
            lastResContent = res.content ?? '';
            lastUsage = res.usage;
            return res;
          },
          3,
        ),
      );
    } catch (err) {
      log.error({ err, raw: lastResContent.slice(0, 500) }, 'summary compactor parse failed');
      throw err;
    }

    log.info({
      summaryLen: parsed.summary.length,
      events: parsed.keyEvents.length,
      chars: parsed.charactersPresent.length,
    }, 'summary compaction complete');

    return {
      output: parsed,
      promptVersion: summaryCompactorPromptV2.version,
      rawContent: lastResContent,
      usage: lastUsage,
    };
  }
}
