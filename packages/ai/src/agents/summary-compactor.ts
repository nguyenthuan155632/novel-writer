import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { SummaryCompactorOutputSchema, SUMMARY_COMPACTOR_JSON_SCHEMA, type SummaryCompactorOutput } from '../schemas/summary.ts';
import { summaryCompactorPromptV1, type SummaryCompactorPromptInput } from '../prompts/summary-compactor.v1.ts';

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

  async compact(input: SummaryCompactorPromptInput, ctx: { traceId: string; storyId: string }): Promise<SummaryCompactionResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'summary_compactor' });
    const built = summaryCompactorPromptV1.build(input as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.summary_compactor,
      messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
      responseSchema: SUMMARY_COMPACTOR_JSON_SCHEMA,
      temperature: 0.2,
      metadata: {
        agentRole: summaryCompactorPromptV1.agentRole,
        promptVersion: summaryCompactorPromptV1.version,
        traceId: ctx.traceId,
        storyId: ctx.storyId,
      },
    });

    let parsed: SummaryCompactorOutput;
    try {
      parsed = SummaryCompactorOutputSchema.parse(JSON.parse(res.content));
    } catch (err) {
      log.error({ err, raw: res.content.slice(0, 500) }, 'summary compactor parse failed');
      throw err;
    }

    log.info({
      shortLen: parsed.shortSummary.length,
      detailLen: parsed.detailedSummary.length,
      events: parsed.keyEvents.length,
      chars: parsed.charactersPresent.length,
    }, 'summary compaction complete');

    return {
      output: parsed,
      promptVersion: summaryCompactorPromptV1.version,
      rawContent: res.content,
      usage: res.usage,
    };
  }
}
