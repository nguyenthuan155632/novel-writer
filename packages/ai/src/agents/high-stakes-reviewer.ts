import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import type { Logger } from './packet-generator.ts';
import { HighStakesReviewSchema, HIGH_STAKES_REVIEW_JSON_SCHEMA, type HighStakesReview } from '../schemas/high-stakes-review.ts';
import { highStakesReviewerPromptV1 } from '../prompts/high-stakes-reviewer.v1.ts';

export interface HighStakesReviewInput {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  chapter: { title: string; content: string };
  arcSummary: string;
  bibleCompact: string;
}

export interface HighStakesReviewResult {
  reviewId: string;
  output: HighStakesReview;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
}

export type HighStakesReviewerDeps = {
  provider: LLMProvider;
  logger: Logger;
};

export class HighStakesReviewerAgent {
  constructor(private readonly deps: HighStakesReviewerDeps) {}

  async review(input: HighStakesReviewInput): Promise<HighStakesReviewResult> {
    const db = getDb();
    const log = this.deps.logger.child({ agent: 'high_stakes_reviewer', storyId: input.storyId, chapterId: input.chapterId });
    const built = highStakesReviewerPromptV1.build({
      chapterTitle: input.chapter.title,
      chapterContent: input.chapter.content,
      arcSummary: input.arcSummary,
      bibleCompact: input.bibleCompact,
    } as Record<string, unknown>);

    const response = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.high_stakes_reviewer,
      messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
      responseSchema: HIGH_STAKES_REVIEW_JSON_SCHEMA,
      temperature: 0.3,
      metadata: { agentRole: highStakesReviewerPromptV1.agentRole, promptVersion: highStakesReviewerPromptV1.version, storyId: input.storyId },
    });

    let parsed: HighStakesReview;
    try {
      parsed = HighStakesReviewSchema.parse(JSON.parse(response.content));
    } catch (err) {
      log.error({ err, raw: response.content.slice(0, 500) }, 'high stakes reviewer parse failed');
      throw err;
    }

    const costUsd = (response.usage.inputTokens * 1.25 + response.usage.outputTokens * 10) / 1_000_000;
    const rows = await db.insert(schema.highStakesReviews).values({
      storyId: input.storyId,
      chapterId: input.chapterId,
      triggerReason: input.triggerReason,
      approve: String(parsed.approve),
      concerns: parsed.concerns,
      recommendedActions: parsed.recommendedActions,
      tokens: response.usage.inputTokens + response.usage.outputTokens,
      costUsd: costUsd.toFixed(6),
      promptVersion: highStakesReviewerPromptV1.version,
    }).returning({ id: schema.highStakesReviews.id });
    const row = rows[0];

    log.info({ approve: parsed.approve, concerns: parsed.concerns.length }, 'review persisted');
    return {
      reviewId: row.id,
      output: parsed,
      promptVersion: highStakesReviewerPromptV1.version,
      usage: response.usage,
    };
  }
}