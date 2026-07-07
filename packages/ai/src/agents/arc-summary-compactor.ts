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

    const summary = sanitizeArcSummaryOutput(r.content);
    log.info({ tokens: r.usage.inputTokens + r.usage.outputTokens }, 'arc summary compacted');
    return { summary, promptVersion: arcSummaryCompactorPromptV2.version, usage: r.usage };
  }
}

function sanitizeArcSummaryOutput(content: string): string {
  const trimmed = content.trim();
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const storyParagraphs = paragraphs.filter((paragraph) => !isCompactorProcessNote(paragraph));
  return (storyParagraphs.length > 0 ? storyParagraphs : paragraphs).join('\n\n').trim();
}

function isCompactorProcessNote(paragraph: string): boolean {
  const lower = paragraph.toLowerCase();
  if (lower === 'tôi' || /^tôi\s+\S{0,8}$/iu.test(paragraph)) return true;
  return (
    lower.includes('người dùng yêu cầu tôi') ||
    lower.includes('với tư cách biên tập') ||
    lower.includes('tôi cần ') ||
    lower.includes('tôi sẽ ') ||
    lower.includes('tôi có ') ||
    lower.includes('trả về plain text') ||
    lower.startsWith('tóm tắt arc hiện tại (') ||
    lower.startsWith('từ tóm tắt arc hiện tại:')
  );
}
