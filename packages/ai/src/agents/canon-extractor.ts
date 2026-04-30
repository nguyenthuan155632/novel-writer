import { MODEL_CONFIG } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { ExtractorOutputSchema, EXTRACTOR_JSON_SCHEMA, type ExtractorOutput } from '../schemas/extractor.ts';
import { canonExtractorPromptV1, type CanonExtractorPromptInput } from '../prompts/canon-extractor.v1.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
}

export type CanonExtractorDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export type CanonExtractionResult = {
  output: ExtractorOutput;
  promptVersion: string;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
};

export class CanonExtractor {
  constructor(private readonly deps: CanonExtractorDeps) {}

  async extract(input: CanonExtractorPromptInput, ctx: { traceId: string; storyId: string }): Promise<CanonExtractionResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'canon_extractor' });
    const built = canonExtractorPromptV1.build(input as unknown as Record<string, unknown>);

    let lastResContent = '';
    let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    let parsed: ExtractorOutput;
    try {
      parsed = ExtractorOutputSchema.parse(
        await withCompletionRetry(
          'canon_extractor',
          async () => {
            const res = await this.deps.provider.complete({
              model: this.deps.model ?? MODEL_CONFIG.routes.canon_extractor,
              messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
              responseSchema: EXTRACTOR_JSON_SCHEMA,
              temperature: 0.2,
              metadata: {
                agentRole: canonExtractorPromptV1.agentRole,
                promptVersion: canonExtractorPromptV1.version,
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
      log.error({ err, raw: lastResContent.slice(0, 500) }, 'canon extractor parse failed');
      throw err;
    }

    log.info({
      chars: parsed.characterUpdates.length,
      facts: parsed.newCanonFacts.length,
      threads: parsed.threadUpdates.length,
      events: parsed.newTimelineEvents.length,
      seeds: parsed.seedsResolvedThisChapter.length,
    }, 'canon extraction complete');

    return {
      output: parsed,
      promptVersion: canonExtractorPromptV1.version,
      rawContent: lastResContent,
      usage: lastUsage,
    };
  }
}
