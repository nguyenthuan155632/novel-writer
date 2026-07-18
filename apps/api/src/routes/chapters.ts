import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { getDb } from "@novel/db";
import {
  arcs,
  canonFacts,
  chapters,
  openThreads,
  pendingCanonUpdates,
  sagas,
  storyBibles,
  timelineEvents,
} from "@novel/db/schema";
import {
  eq,
  and,
  asc,
  desc,
  gte,
  isNull,
  lte,
  or,
  sql,
  count,
} from "drizzle-orm";
import { newTraceId } from "@novel/core/trace";
import {
  enqueueGenerateChapter,
  getGenerateChapterStatus,
} from "../services/queue-client.js";
import { getQueueLlmSnapshot } from "../lib/provider-switcher.ts";
import { runGeneratePreflight } from "../services/preflight.ts";

const ChapterParams = z.object({
  storyId: z.string().uuid(),
});

const ChapterDetailParams = z.object({
  storyId: z.string().uuid(),
  chapterNumber: z.coerce.number().int().positive(),
});

const PostGenerateBody = z.object({
  chapterNumber: z.number().int().positive(),
  mode: z.enum(["safe", "semi_auto", "full_auto"]).default("safe"),
});

async function getMissingPlanningSteps(
  db: ReturnType<typeof getDb>,
  storyId: string,
  chapterNumber: number,
): Promise<Array<"bible" | "saga" | "arc">> {
  const missing: Array<"bible" | "saga" | "arc"> = [];

  const [bible] = await db
    .select({ id: storyBibles.id })
    .from(storyBibles)
    .where(eq(storyBibles.storyId, storyId))
    .orderBy(desc(storyBibles.version), desc(storyBibles.createdAt))
    .limit(1);
  if (!bible) missing.push("bible");

  const [saga] = await db
    .select({ id: sagas.id })
    .from(sagas)
    .where(
      and(
        eq(sagas.storyId, storyId),
        lte(sagas.startChapter, chapterNumber),
        or(isNull(sagas.endChapter), gte(sagas.endChapter, chapterNumber)),
      ),
    )
    .limit(1);
  if (!saga) missing.push("saga");

  const [arc] = await db
    .select({ id: arcs.id })
    .from(arcs)
    .where(
      and(
        eq(arcs.storyId, storyId),
        lte(arcs.startChapter, chapterNumber),
        or(isNull(arcs.endChapter), gte(arcs.endChapter, chapterNumber)),
      ),
    )
    .limit(1);
  if (!arc) missing.push("arc");

  return missing;
}

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get("/api/stories/:storyId/chapters", async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const db = getDb();
    const rows = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        status: chapters.status,
        wordCount: chapters.wordCount,
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(desc(chapters.chapterNumber));
    return reply.send({ chapters: rows });
  });

  app.get(
    "/api/stories/:storyId/chapters/:chapterNumber",
    async (req, reply) => {
      const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
      const db = getDb();
      const [row] = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.storyId, storyId),
            eq(chapters.chapterNumber, chapterNumber),
          ),
        )
        .limit(1);
      if (!row) return reply.code(404).send({ error: "chapter_not_found" });

      // Safeguard: auto-complete only written chapters whose canon review queue is empty.
      if (row.status === "paused_pending_updates") {
        const [pendingRow] = await db
          .select({ pending: count() })
          .from(pendingCanonUpdates)
          .where(
            and(
              eq(pendingCanonUpdates.chapterId, row.id),
              eq(pendingCanonUpdates.resolution, "pending"),
            ),
          );
        if (
          row.content &&
          row.packetAuditStatus === "passed" &&
          (!pendingRow || pendingRow.pending === 0)
        ) {
          await db
            .update(chapters)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(chapters.id, row.id));
          row.status = "completed";
        }
      }

      return reply.send({ chapter: row });
    },
  );

  app.post("/api/stories/:storyId/chapters/generate", async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const body = PostGenerateBody.parse(req.body);
    const db = getDb();
    const missing = await getMissingPlanningSteps(
      db,
      storyId,
      body.chapterNumber,
    );
    if (missing.length > 0) {
      return reply.code(409).send({
        error: "planning_required",
        missing,
        chapterNumber: body.chapterNumber,
      });
    }

    const preflight = await runGeneratePreflight({
      storyId,
      chapterNumber: body.chapterNumber,
    });
    if (!preflight.ok) {
      return reply.code(409).send({
        error: "preflight_failed",
        failed: preflight.failed,
        chapterNumber: body.chapterNumber,
      });
    }

    const llmSnapshot = await getQueueLlmSnapshot();
    const traceId =
      (req as unknown as { traceId?: string }).traceId ?? newTraceId();
    const { jobId } = await enqueueGenerateChapter({
      storyId,
      chapterNumber: body.chapterNumber,
      mode: body.mode,
      traceId,
      llmProvider: llmSnapshot.llmProvider,
      modelRoutes: llmSnapshot.modelRoutes,
    });
    return reply
      .code(202)
      .send({ jobId, storyId, chapterNumber: body.chapterNumber });
  });

  app.get(
    "/api/stories/:storyId/chapters/:chapterNumber/status",
    async (req, reply) => {
      const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
      const status = await getGenerateChapterStatus(storyId, chapterNumber);
      if (!status) return reply.code(404).send({ error: "no_active_job" });
      return reply.send(status);
    },
  );

  app.get(
    "/api/stories/:storyId/chapters/:chapterNumber/stream",
    async (req, reply) => {
      const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("connected", { storyId, chapterNumber });

      const pollInterval = setInterval(async () => {
        const status = await getGenerateChapterStatus(storyId, chapterNumber);
        if (!status) {
          sendEvent("status", { state: "unknown" });
        } else {
          sendEvent("status", status);
          if (status.state === "completed" || status.state === "failed") {
            clearInterval(pollInterval);
            reply.raw.end();
          }
        }
      }, 2000);

      req.raw.on("close", () => {
        clearInterval(pollInterval);
      });
    },
  );

  app.delete(
    "/api/stories/:storyId/chapters/:chapterNumber",
    async (req, reply) => {
      const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
      const db = getDb();

      const [chapter] = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.storyId, storyId),
            eq(chapters.chapterNumber, chapterNumber),
          ),
        )
        .limit(1);

      if (!chapter) {
        return reply.code(404).send({ error: "chapter_not_found" });
      }

      if (chapter.status === "generating") {
        return reply.code(409).send({ error: "chapter_is_generating" });
      }

      const [maxRow] = await db
        .select({ max: sql<number>`MAX(${chapters.chapterNumber})` })
        .from(chapters)
        .where(eq(chapters.storyId, storyId));

      const max = maxRow?.max ?? 0;
      if (chapterNumber < max) {
        return reply
          .code(400)
          .send({ error: "only_latest_chapter_can_be_deleted" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(timelineEvents)
          .where(
            and(
              eq(timelineEvents.storyId, storyId),
              eq(timelineEvents.chapterNumber, chapterNumber),
            ),
          );

        await tx
          .update(openThreads)
          .set({ openedChapter: sql`NULL` })
          .where(
            and(
              eq(openThreads.storyId, storyId),
              eq(openThreads.openedChapter, chapterNumber),
            ),
          );

        await tx
          .update(openThreads)
          .set({ plannedResolutionChapter: sql`NULL` })
          .where(
            and(
              eq(openThreads.storyId, storyId),
              eq(openThreads.plannedResolutionChapter, chapterNumber),
            ),
          );

        await tx
          .delete(canonFacts)
          .where(
            and(
              eq(canonFacts.storyId, storyId),
              eq(canonFacts.sourceChapter, chapterNumber),
            ),
          );

        await tx.delete(chapters).where(eq(chapters.id, chapter.id));
      });

      return reply.code(204).send();
    },
  );

  done();
};

export default plugin;
