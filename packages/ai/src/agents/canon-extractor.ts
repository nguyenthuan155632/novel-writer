import { MODEL_CONFIG } from '@novel/core';
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

    let parsed: ExtractorOutput;
    try {
      parsed = ExtractorOutputSchema.parse(JSON.parse(res.content));
    } catch (err) {
      log.error({ err, raw: res.content.slice(0, 500) }, 'canon extractor parse failed');
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
      rawContent: res.content,
      usage: res.usage,
    };
  }
}
