import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import type { Logger } from './packet-generator.ts';
import { arcSummaryCompactorPromptV2 } from '../prompts/arc-summary-compactor.v2.ts';

export interface ArcSummaryCompactorInput {
  storyId: string;
  arcTitle: string;
  previousRollingSummary?: string;
  perChapterSummaries: { chapterNumber: number; summary: string }[];
}

export type ArcSummaryCompactorDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export class ArcSummaryCompactorAgent {
  constructor(private readonly deps: ArcSummaryCompactorDeps) {}

  async compact(input: ArcSummaryCompactorInput): Promise<{ summary: string; promptVersion: string; usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number } }> {
    const log = this.deps.logger.child({ agent: 'arc_summary_compactor', storyId: input.storyId });
    const built = arcSummaryCompactorPromptV2.build({
      arcTitle: input.arcTitle,
      previousRollingSummary: input.previousRollingSummary,
      perChapterSummaries: input.perChapterSummaries,
    } as Record<string, unknown>);

    const r = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.arc_summary_compactor,
      messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
      temperature: 0.4,
      maxOutputTokens: 1500,
      metadata: { agentRole: arcSummaryCompactorPromptV2.agentRole, promptVersion: arcSummaryCompactorPromptV2.version, storyId: input.storyId },
    });

    log.info({ tokens: r.usage.inputTokens + r.usage.outputTokens }, 'arc summary compacted');
    return { summary: r.content.trim(), promptVersion: arcSummaryCompactorPromptV2.version, usage: r.usage };
  }
}
