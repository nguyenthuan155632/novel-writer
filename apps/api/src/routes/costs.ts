import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { BudgetGuard, BUDGET_GUARDRAILS } from '../services/budget-guard.ts';

const StoryParam = z.object({ storyId: z.string().uuid() });

const costsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/costs/summary', async (req, reply) => {
    const { storyId } = StoryParam.parse(req.params);
    const usage = await new BudgetGuard().getStoryUsage(storyId);
    return reply.send({ usage, caps: BUDGET_GUARDRAILS });
  });

  app.get('/api/stories/:storyId/costs/by-agent', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const rows = await db
      .select({
        agent: schema.llmCalls.agentRole,
        callCount: sql<number>`COUNT(*)::int`,
        tokens: sql<number>`COALESCE(SUM(${schema.llmCalls.inputTokens} + ${schema.llmCalls.outputTokens}), 0)::int`,
        cost: sql<string>`COALESCE(SUM(${schema.llmCalls.estimatedCostUsd}), 0)`,
      })
      .from(schema.llmCalls)
      .where(and(eq(schema.llmCalls.storyId, storyId), gte(schema.llmCalls.createdAt, monthAgo)))
      .groupBy(schema.llmCalls.agentRole);
    return reply.send({ rows });
  });

  app.get('/api/stories/:storyId/costs/by-chapter', async (req, reply) => {
    const db = getDb();
    const { storyId } = StoryParam.parse(req.params);
    const rows = await db
      .select({
        chapterNumber: schema.llmCalls.chapterId,
        cost: sql<string>`COALESCE(SUM(${schema.llmCalls.estimatedCostUsd}), 0)`,
        tokens: sql<number>`COALESCE(SUM(${schema.llmCalls.inputTokens} + ${schema.llmCalls.outputTokens}), 0)::int`,
      })
      .from(schema.llmCalls)
      .where(eq(schema.llmCalls.storyId, storyId))
      .groupBy(schema.llmCalls.chapterId);
    return reply.send({ rows });
  });

  done();
};

export default costsRoute;