import { getDb } from '@novel/db';
import { sagas, plantedSeeds } from '@novel/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { withCompletionRetryRaw } from '../parse-completion-json.ts';
import type { Logger } from './packet-generator.js';
import { SagaPlannerOutputSchema, type SagaPlannerOutput } from '../schemas/saga.ts';
import { sagaPlannerPromptV2 } from '../prompts/saga-planner.v2.ts';
import type { SagaPlannerInput, SagaPlannerResult } from './saga-planner.types.ts';

export type SagaPlannerDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export class SagaPlannerAgent {
  constructor(private readonly deps: SagaPlannerDeps) {}

  async plan(input: SagaPlannerInput): Promise<SagaPlannerResult> {
    const log = this.deps.logger.child({ agent: 'saga_planner', storyId: input.storyId });
    const built = sagaPlannerPromptV2.build({
      bibleCompact: input.bibleCompact,
      targetChapters: input.targetChapters,
      genreDef: input.genreDef,
      storyOptions: input.storyOptions,
    } as Record<string, unknown>);

    const response = await withCompletionRetryRaw(
      'saga_planner',
      async () => this.deps.provider.complete({
        model: this.deps.model ?? MODEL_CONFIG.routes.saga_planner,
        messages: [
          { role: 'system', content: built.system },
          { role: 'user', content: `${built.user}\n\nReturn ONLY valid JSON matching this shape:\n{\n  "sagas": [{ "index": 0, "title": "...", "premise": "...", "startChapter": 1, "endChapter": 100, "expectedTurningPoints": ["...", "..."], "parallelThreads": [{ "id": "thread-1", "premise": "...", "startChapter": 10, "endChapter": 30, "parentTimelineId": null }], "convergencePoints": [{ "atChapter": 30, "threadIds": ["thread-1"], "synopsis": "..." }] }],\n  "plantedSeeds": [{ "seedKey": "...", "description": "...", "plantWindowStart": 1, "plantWindowEnd": 20, "payoffChapter": 60, "importance": "minor" }]\n}` },
        ],
        temperature: 0.7,
        metadata: {
          agentRole: sagaPlannerPromptV2.agentRole,
          promptVersion: sagaPlannerPromptV2.version,
          storyId: input.storyId,
        },
      }),
      3,
    );

    let parsed: SagaPlannerOutput;
    try {
      parsed = SagaPlannerOutputSchema.parse(JSON.parse(extractJson(response.content)));
    } catch (err) {
      log.error({ err, raw: response.content.slice(0, 500) }, 'saga planner parse failed');
      throw err;
    }

    log.info({ sagaCount: parsed.sagas.length, seedCount: parsed.plantedSeeds.length }, 'plan ok');

    return {
      output: parsed,
      promptVersion: sagaPlannerPromptV2.version,
      usage: response.usage,
    };
  }

  async persist(
    storyId: string,
    output: SagaPlannerOutput,
    opts: { resetSeeds?: boolean } = {},
  ): Promise<{ sagasUpserted: number; seedsUpserted: number }> {
    const db = getDb();
    let sagasUpserted = 0;
    let seedsUpserted = 0;

    await db.transaction(async (tx) => {
      for (const s of output.sagas) {
        const existing = await tx
          .select({ id: sagas.id })
          .from(sagas)
          .where(and(eq(sagas.storyId, storyId), eq(sagas.sagaNumber, s.index)))
          .limit(1);
        if (existing.length > 0) {
          await tx.update(sagas)
            .set({
              title: s.title,
              premise: s.premise,
              startChapter: s.startChapter,
              endChapter: s.endChapter,
              expectedTurningPoints: s.expectedTurningPoints,
              parallelThreads: s.parallelThreads,
              convergencePoints: s.convergencePoints,
              summaryVersion: 0,
            })
            .where(eq(sagas.id, existing[0]!.id));
        } else {
          await tx.insert(sagas).values({
            storyId,
            sagaNumber: s.index,
            title: s.title,
            premise: s.premise,
            startChapter: s.startChapter,
            endChapter: s.endChapter,
            expectedTurningPoints: s.expectedTurningPoints,
            summaryVersion: 0,
          });
        }
        sagasUpserted++;
      }

      for (const seed of output.plantedSeeds) {
        const existing = await tx
          .select({ id: plantedSeeds.id, status: plantedSeeds.status })
          .from(plantedSeeds)
          .where(and(eq(plantedSeeds.storyId, storyId), eq(plantedSeeds.seedKey, seed.seedKey)))
          .limit(1);
        if (existing.length > 0 && !opts.resetSeeds) continue;
        if (existing.length > 0) {
          await tx.update(plantedSeeds).set({
            description: seed.description,
            seedText: seed.description,
            payoffDescription: `Payoff at ch ${seed.payoffChapter}: ${seed.description}`,
            plantWindowStart: seed.plantWindowStart,
            plantWindowEnd: seed.plantWindowEnd,
            payoffChapter: seed.payoffChapter,
            importance: seed.importance,
            status: 'pending',
          }).where(eq(plantedSeeds.id, existing[0]!.id));
        } else {
          await tx.insert(plantedSeeds).values({
            storyId,
            seedKey: seed.seedKey,
            description: seed.description,
            seedText: seed.description,
            payoffDescription: `Payoff at ch ${seed.payoffChapter}: ${seed.description}`,
            plantWindowStart: seed.plantWindowStart,
            plantWindowEnd: seed.plantWindowEnd,
            payoffChapter: seed.payoffChapter,
            importance: seed.importance,
            status: 'pending',
            createdByAgent: 'saga_planner',
          });
        }
        seedsUpserted++;
      }
    });

    return { sagasUpserted, seedsUpserted };
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}
