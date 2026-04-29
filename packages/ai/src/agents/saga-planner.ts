import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import type { Logger } from './packet-generator.js';
import { SagaPlannerOutputSchema, SAGA_PLANNER_JSON_SCHEMA } from '../schemas/saga.ts';
import { sagaPlannerPromptV1 } from '../prompts/saga-planner.v1.ts';
import type { SagaPlannerInput, SagaPlannerResult } from './saga-planner.types.ts';

export type SagaPlannerDeps = {
  provider: LLMProvider;
  logger: Logger;
};

export class SagaPlannerAgent {
  constructor(private readonly deps: SagaPlannerDeps) {}

  async plan(input: SagaPlannerInput): Promise<SagaPlannerResult> {
    const log = this.deps.logger.child({ agent: 'saga_planner', storyId: input.storyId });
    const built = sagaPlannerPromptV1.build({
      bibleCompact: input.bibleCompact,
      targetChapters: input.targetChapters,
    } as Record<string, unknown>);

    const response = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.saga_planner,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      responseSchema: SAGA_PLANNER_JSON_SCHEMA,
      temperature: 0.7,
      metadata: {
        agentRole: sagaPlannerPromptV1.agentRole,
        promptVersion: sagaPlannerPromptV1.version,
        storyId: input.storyId,
      },
    });

    let parsed: SagaPlannerOutput;
    try {
      parsed = SagaPlannerOutputSchema.parse(JSON.parse(response.content));
    } catch (err) {
      log.error({ err, raw: response.content.slice(0, 500) }, 'saga planner parse failed');
      throw err;
    }

    log.info({ sagaCount: parsed.sagas.length, seedCount: parsed.plantedSeeds.length }, 'plan ok');

    return {
      output: parsed,
      promptVersion: sagaPlannerPromptV1.version,
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
          .select({ id: schema.sagas.id })
          .from(schema.sagas)
          .where(and(eq(schema.sagas.storyId, storyId), eq(schema.sagas.sagaNumber, s.index)))
          .limit(1);
        if (existing.length > 0) {
          await tx.update(schema.sagas)
            .set({
              title: s.title,
              premise: s.premise,
              startChapter: s.startChapter,
              endChapter: s.endChapter,
              expectedTurningPoints: s.expectedTurningPoints,
              summaryVersion: 0,
            })
            .where(eq(schema.sagas.id, existing[0].id));
        } else {
          await tx.insert(schema.sagas).values({
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
          .select({ id: schema.plantedSeeds.id, status: schema.plantedSeeds.status })
          .from(schema.plantedSeeds)
          .where(and(eq(schema.plantedSeeds.storyId, storyId), eq(schema.plantedSeeds.seedKey, seed.seedKey)))
          .limit(1);
        if (existing.length > 0 && !opts.resetSeeds) continue;
        if (existing.length > 0) {
          await tx.update(schema.plantedSeeds).set({
            description: seed.description,
            seedText: seed.description,
            payoffDescription: `Payoff at ch ${seed.payoffChapter}: ${seed.description}`,
            plantWindowStart: seed.plantWindowStart,
            plantWindowEnd: seed.plantWindowEnd,
            payoffChapter: seed.payoffChapter,
            importance: seed.importance,
            status: 'pending',
          }).where(eq(schema.plantedSeeds.id, existing[0].id));
        } else {
          await tx.insert(schema.plantedSeeds).values({
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