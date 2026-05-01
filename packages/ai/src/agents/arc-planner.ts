import { getDb } from '@novel/db';
import { sagas, plantedSeeds, arcs } from '@novel/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { withCompletionRetryRaw } from '../parse-completion-json.ts';
import type { Logger } from './packet-generator.ts';
import { ArcPlannerOutputSchema, ARC_PLANNER_JSON_SCHEMA, type ArcPlannerOutput } from '../schemas/arc.ts';
import { arcPlannerPromptV1 } from '../prompts/arc-planner.v1.ts';

export interface ArcPlannerInput {
  storyId: string;
  sagaId: string;
  currentState: string;
}

export interface ArcPlannerResult {
  output: ArcPlannerOutput;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
}

export type ArcPlannerDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export class ArcPlannerAgent {
  constructor(private readonly deps: ArcPlannerDeps) {}

  async plan(input: ArcPlannerInput): Promise<ArcPlannerResult> {
    const db = getDb();
    const log = this.deps.logger.child({ agent: 'arc_planner', storyId: input.storyId, sagaId: input.sagaId });

    const [saga] = await db.select().from(sagas).where(eq(sagas.id, input.sagaId)).limit(1);
    if (!saga) throw new Error(`Saga ${input.sagaId} not found`);

    const unresolvedSeeds = await db
      .select({ seedKey: plantedSeeds.seedKey, description: plantedSeeds.description, payoffChapter: plantedSeeds.payoffChapter })
      .from(plantedSeeds)
      .where(and(eq(plantedSeeds.storyId, input.storyId), eq(plantedSeeds.status, 'pending')));

    const sagaSeeds = unresolvedSeeds.filter((s) => {
      const pc = s.payoffChapter ?? 0;
      return pc >= (saga.startChapter ?? 0) && pc <= (saga.endChapter ?? 0);
    });

    const built = arcPlannerPromptV1.build({
      sagaTitle: saga.title,
      sagaStart: saga.startChapter,
      sagaEnd: saga.endChapter,
      sagaPremise: saga.premise ?? '',
      turningPoints: saga.expectedTurningPoints,
      currentState: input.currentState,
      unresolvedSeeds: sagaSeeds,
    } as Record<string, unknown>);

    const response = await withCompletionRetryRaw(
      'arc_planner',
      async () => this.deps.provider.complete({
        model: this.deps.model ?? MODEL_CONFIG.routes.arc_planner,
        messages: [{ role: 'system', content: built.system }, { role: 'user', content: built.user }],
        responseSchema: ARC_PLANNER_JSON_SCHEMA,
        temperature: 0.7,
        metadata: { agentRole: arcPlannerPromptV1.agentRole, promptVersion: arcPlannerPromptV1.version, storyId: input.storyId },
      }),
      3,
    );

    let parsed: ArcPlannerOutput;
    try {
      parsed = ArcPlannerOutputSchema.parse(JSON.parse(response.content));
    } catch (err) {
      log.error({ err, raw: response.content.slice(0, 500) }, 'arc planner parse failed');
      throw err;
    }

    log.info({ arcCount: parsed.arcs.length }, 'plan ok');
    return { output: parsed, promptVersion: arcPlannerPromptV1.version, usage: response.usage };
  }

  async persist(storyId: string, sagaId: string, output: ArcPlannerOutput): Promise<{ arcsUpserted: number }> {
    const db = getDb();
    let count = 0;
    await db.transaction(async (tx) => {
      for (const a of output.arcs) {
        const existing = await tx.select({ id: arcs.id }).from(arcs)
          .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId), eq(arcs.arcNumber, a.index)))
          .limit(1);
        if (existing.length > 0) {
          await tx.update(arcs).set({
            title: a.title, premise: a.premise,
            startChapter: a.startChapter, endChapter: a.endChapter,
            expectedChanges: a.expectedChanges,
            seedsToResolveInArc: a.seedsToResolveInArc ?? [],
            summaryVersion: 0,
          }).where(eq(arcs.id, existing[0]!.id));
        } else {
          await tx.insert(arcs).values({
            storyId, sagaId, arcNumber: a.index,
            title: a.title, premise: a.premise,
            startChapter: a.startChapter, endChapter: a.endChapter,
            expectedChanges: a.expectedChanges,
            seedsToResolveInArc: a.seedsToResolveInArc ?? [],
            summaryVersion: 0,
          });
        }
        count++;
      }
    });
    return { arcsUpserted: count };
  }
}
