import { getDb } from "@novel/db";
import { chapters, chapterSummaries } from "@novel/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import type { Logger } from "pino";
import { HighStakesReviewerAgent, loadStoryDomainContext } from "@novel/ai";
import type { LlmProviderId, ModelRoutes } from "@novel/core";
import { buildLoggedWorkerProvider } from "./provider.js";

export interface HighStakesReviewJobData {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: "arc_end" | "critical_severity" | "manual";
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}

export async function runHighStakesReviewJob(
  data: HighStakesReviewJobData,
  ctx: { logger: Logger },
) {
  const db = getDb();
  const { storyId, chapterId, chapterNumber, triggerReason } = data;
  const log = ctx.logger.child({ chapterId, storyId, triggerReason });

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) {
    log.warn("chapter not found; noop");
    return { status: "skipped" as const };
  }

  const summaries = await db
    .select({ rollingSummary: chapterSummaries.summary })
    .from(chapterSummaries)
    .innerJoin(chapters, eq(chapterSummaries.chapterId, chapters.id))
    .where(
      and(
        eq(chapters.storyId, storyId),
        or(
          eq(chapters.status, "completed"),
          eq(chapters.status, "paused_pending_updates"),
        ),
      ),
    )
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(10);

  const arcSummary = summaries
    .map(
      (s, i) =>
        `Chapter ${chapterNumber - i}: ${s.rollingSummary ?? "(no summary)"}`,
    )
    .join("\n");

  const domain = await loadStoryDomainContext(db, storyId);
  const { provider, modelRoutes } = await buildLoggedWorkerProvider(db, data);
  const agent = new HighStakesReviewerAgent({
    provider,
    logger: log as any,
    model: modelRoutes.high_stakes_reviewer,
  });

  const result = await agent.review({
    storyId,
    chapterId,
    chapterNumber,
    triggerReason,
    chapter: {
      title: chapter.title ?? `Chapter ${chapterNumber}`,
      content: chapter.content ?? "",
    },
    arcSummary,
    bibleCompact: "",
    genreDef: domain.genreDef,
    personalityDef: domain.personalityDef,
    storyOptions: domain.storyOptions,
  });

  log.info(
    { approve: result.output.approve, reviewId: result.reviewId },
    "high-stakes review completed",
  );
  return { status: "reviewed" as const, reviewId: result.reviewId };
}
