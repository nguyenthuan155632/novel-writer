import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb, type Db } from '@novel/db';
import {
  canonFacts,
  characters,
  chapters,
  openThreads,
  pendingCanonUpdates,
  plantedSeeds,
  timelineEvents,
} from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { ImportanceLevel, CanonConflictType } from '@novel/core';

const StoryParams = z.object({
  storyId: z.string().uuid(),
});

const UpdateParams = z.object({
  storyId: z.string().uuid(),
  updateId: z.string().uuid(),
});

const ApproveBody = z.object({
  resolution: z.enum(['approved', 'edited']).default('approved'),
});

const RejectBody = z.object({
  reason: z.string().min(1).max(1000),
});

async function maybeAutoCompleteChapter(db: Db, chapterId: string): Promise<void> {
  const [chapter] = await db
    .select({ status: chapters.status })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (chapter?.status !== 'paused_pending_updates') return;

  const remaining = await db
    .select()
    .from(pendingCanonUpdates)
    .where(
      and(
        eq(pendingCanonUpdates.chapterId, chapterId),
        eq(pendingCanonUpdates.resolution, 'pending'),
      ),
    )
    .limit(1);

  if (remaining.length === 0) {
    await db
      .update(chapters)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  }
}

async function applyPendingUpdate(db: Db, update: typeof pendingCanonUpdates.$inferSelect): Promise<void> {
  const payload = update.payload;
  switch (update.targetTable) {
    case 'characters': {
      if (update.updateType === 'create') {
        await db.insert(characters).values({
          storyId: update.storyId,
          name: (payload.name as string | undefined) ?? 'Unnamed',
          currentRealm: payload.currentRealm as string | undefined,
          status: (payload.status as string | undefined) ?? 'alive',
          currentBloodlines: (payload.bloodlines as string[] | undefined) ?? [],
        });
      } else if (update.updateType === 'update' && update.targetId) {
        const fields = (payload.fields as Record<string, unknown> | undefined) ?? payload;
        const setFields: Record<string, unknown> = {};
        if (fields.currentRealm !== undefined) setFields.currentRealm = fields.currentRealm;
        if (fields.status !== undefined) setFields.status = fields.status;
        if (fields.bloodlines !== undefined) setFields.currentBloodlines = fields.bloodlines;
        if (fields.shortTraits !== undefined) setFields.abilities = fields.shortTraits;
        if (Object.keys(setFields).length > 0) {
          await db.update(characters)
            .set({ ...setFields, updatedAt: new Date() })
            .where(and(eq(characters.storyId, update.storyId), eq(characters.id, update.targetId)));
        }
      }
      break;
    }
    case 'canon_facts': {
      if (update.updateType === 'create') {
        const importance = ((payload.importance as string | undefined) ?? 'medium') as ImportanceLevel;
        await db.insert(canonFacts).values({
          storyId: update.storyId,
          fact: payload.fact as string,
          sourceChapter: null,
          importance,
          locked: importance === 'locked',
          tags: payload.topic ? [String(payload.topic)] : [],
        });
      }
      break;
    }
    case 'open_threads': {
      if (update.updateType === 'create') {
        await db.insert(openThreads).values({
          storyId: update.storyId,
          title: (payload.title as string | undefined) ?? 'Untitled',
          openedChapter: null,
          plannedResolutionChapter: payload.plannedResolutionChapter as number | undefined,
          status: 'open',
        });
      } else if (update.targetId) {
        await db.update(openThreads)
          .set({
            ...(payload.title !== undefined ? { title: payload.title as string } : {}),
            ...(payload.state !== undefined ? { status: payload.state as string } : {}),
            ...(update.updateType === 'resolve' ? { status: 'resolved' } : {}),
            ...(payload.plannedResolutionChapter !== undefined ? { plannedResolutionChapter: payload.plannedResolutionChapter as number } : {}),
            ...(payload.resolutionNotes !== undefined ? { resolutionNotes: payload.resolutionNotes as string } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(openThreads.storyId, update.storyId), eq(openThreads.id, update.targetId)));
      }
      break;
    }
    case 'timeline_events': {
      if (update.updateType === 'create') {
        await db.insert(timelineEvents).values({
          storyId: update.storyId,
          chapterNumber: (payload.chapterNumber as number | undefined) ?? 0,
          eventText: payload.description as string,
          importance: ((payload.significance as string | undefined) ?? 'minor') as ImportanceLevel,
          relatedCharacterIds: (payload.charactersInvolved as string[] | undefined) ?? [],
        });
      }
      break;
    }
    case 'planted_seeds': {
      if (update.targetId) {
        await db.update(plantedSeeds)
          .set({
            status: (payload.status as string | undefined) ?? 'paid_off',
            paidOffAtChapter: payload.paidOffAtChapter as number | undefined,
          })
          .where(and(eq(plantedSeeds.storyId, update.storyId), eq(plantedSeeds.id, update.targetId)));
      }
      break;
    }
  }
}

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/pending-updates', async (req, reply) => {
    const { storyId } = StoryParams.parse(req.params);
    const resolution = (req.query as { resolution?: string }).resolution ?? 'pending';
    const db = getDb();
    const rows = await db
      .select()
      .from(pendingCanonUpdates)
      .where(
        and(
          eq(pendingCanonUpdates.storyId, storyId),
          eq(pendingCanonUpdates.resolution, resolution),
        ),
      )
      .orderBy(asc(pendingCanonUpdates.createdAt));
    return reply.send({ pendingUpdates: rows });
  });

  app.post('/api/stories/:storyId/pending-updates/:updateId/approve', async (req, reply) => {
    const { storyId, updateId } = UpdateParams.parse(req.params);
    const body = ApproveBody.parse(req.body);
    const db = getDb();
    const [pending] = await db.select()
      .from(pendingCanonUpdates)
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)))
      .limit(1);
    if (!pending) return reply.code(404).send({ error: 'pending_update_not_found' });

    await applyPendingUpdate(db, pending);
    const [row] = await db.update(pendingCanonUpdates)
      .set({ resolution: body.resolution, conflictStatus: 'resolved', reviewedBy: 'human', resolvedAt: new Date() })
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)))
      .returning();
    await maybeAutoCompleteChapter(db, pending.chapterId);
    return reply.send({ pendingUpdate: row });
  });

  app.post('/api/stories/:storyId/pending-updates/:updateId/reject', async (req, reply) => {
    const { storyId, updateId } = UpdateParams.parse(req.params);
    const body = RejectBody.parse(req.body);
    const db = getDb();
    const [row] = await db
      .update(pendingCanonUpdates)
      .set({
        resolution: 'rejected',
        conflictStatus: 'resolved',
        conflictReasons: [body.reason as CanonConflictType],
        reviewedBy: 'human',
        resolvedAt: new Date(),
      })
      .where(and(eq(pendingCanonUpdates.id, updateId), eq(pendingCanonUpdates.storyId, storyId)))
      .returning();
    if (!row) return reply.code(404).send({ error: 'pending_update_not_found' });
    await maybeAutoCompleteChapter(db, row.chapterId);
    return reply.send({ pendingUpdate: row });
  });

  done();
};

export default plugin;
