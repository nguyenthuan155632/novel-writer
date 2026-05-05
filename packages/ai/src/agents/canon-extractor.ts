import { MODEL_CONFIG } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { ExtractorOutputSchema, EXTRACTOR_JSON_SCHEMA, type ExtractorOutput } from '../schemas/extractor.ts';
import { canonExtractorPromptV2, type CanonExtractorV2PromptInput } from '../prompts/canon-extractor.v2.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
}

export type CanonExtractorDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
  onParseRecovery?: (event: { strategy: 'strip_fences' | 'extract_object' | 're_prompt'; detail: string }) => void;
};

export type CanonExtractionResult = {
  output: ExtractorOutput;
  promptVersion: string;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
};

export class CanonExtractor {
  constructor(private readonly deps: CanonExtractorDeps) {}

  async extract(input: CanonExtractorV2PromptInput, ctx: { traceId: string; storyId: string }): Promise<CanonExtractionResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'canon_extractor' });
    const built = canonExtractorPromptV2.build(input as unknown as Record<string, unknown>);

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
                agentRole: canonExtractorPromptV2.agentRole,
                promptVersion: canonExtractorPromptV2.version,
                traceId: ctx.traceId,
                storyId: ctx.storyId,
              },
            });
            lastResContent = res.content ?? '';
            lastUsage = res.usage;
            return res;
          },
          3,
          {
            request: {
              model: this.deps.model ?? MODEL_CONFIG.routes.canon_extractor,
              messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
              responseSchema: EXTRACTOR_JSON_SCHEMA,
              temperature: 0.2,
              metadata: {
                agentRole: canonExtractorPromptV2.agentRole,
                promptVersion: canonExtractorPromptV2.version,
                traceId: ctx.traceId,
                storyId: ctx.storyId,
              },
            },
            onParseRecovery: this.deps.onParseRecovery,
          },
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
      promptVersion: canonExtractorPromptV2.version,
      rawContent: lastResContent,
      usage: lastUsage,
    };
  }
}
