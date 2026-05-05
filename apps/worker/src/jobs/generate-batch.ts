import { getDb } from "@novel/db";
import { batches } from "@novel/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@novel/core/logger";
import type { LlmProviderId, ModelRoutes } from "@novel/core";

const log = createLogger("generate-batch");

const MAX_CHAPTER_RETRIES = 3;
const CHAPTER_RETRY_DELAY_MS = [10_000, 30_000, 60_000];

export interface GenerateBatchJobData {
  batchId: string;
  storyId: string;
  startChapter: number;
  endChapter: number;
  mode: "safe" | "semi_auto" | "full_auto";
  traceId: string;
  llmProvider?: LlmProviderId;
  modelRoutes?: Partial<ModelRoutes>;
}

export async function runGenerateBatchJob(
  data: GenerateBatchJobData,
  ctx: { logger: any },
): Promise<{ status: string; completed: number }> {
  const db = getDb();
  const { batchId, storyId, startChapter, endChapter, mode, traceId } = data;
  const jobLog = ctx.logger ?? log;

  jobLog.info(
    { batchId, storyId, startChapter, endChapter },
    "batch job started",
  );

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);
  if (!batch || batch.status === "cancelled") {
    return { status: "cancelled", completed: 0 };
  }

  // Resume support: read prior progress from DB so a re-queued batch resumes where it stopped.
  let completed = batch.completedChapters ?? 0;
  let totalCostUsd = Number(batch.totalCostUsd ?? 0);
  const resumeFrom = (batch.checkpointChapter ?? (startChapter + completed - 1)) + 1;

  await db
    .update(batches)
    .set({ resumedFromChapter: resumeFrom })
    .where(eq(batches.id, batchId));

  jobLog.info(
    { batchId, resumeFrom, completed },
    "batch resuming from chapter",
  );

  for (
    let chapterNumber = resumeFrom;
    chapterNumber <= endChapter;
    chapterNumber++
  ) {
    const { runGenerateChapterJob } = await import("./generate-chapter.js");

    type ChapterResult = Awaited<ReturnType<typeof runGenerateChapterJob>>;
    let result: ChapterResult | null = null;
    let lastError: unknown = null;

    // Per-chapter retry loop
    for (let attempt = 0; attempt < MAX_CHAPTER_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay =
          CHAPTER_RETRY_DELAY_MS[attempt - 1] ??
          CHAPTER_RETRY_DELAY_MS[CHAPTER_RETRY_DELAY_MS.length - 1]!;
        jobLog.warn(
          { batchId, chapterNumber, attempt, delayMs: delay },
          "retrying chapter after backoff delay",
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }

      try {
        const chapterTraceId =
          attempt === 0
            ? `${traceId}:ch${chapterNumber}`
            : `${traceId}:ch${chapterNumber}:retry${attempt}`;

        result = await runGenerateChapterJob(
          {
            storyId,
            chapterNumber,
            mode,
            traceId: chapterTraceId,
            llmProvider: data.llmProvider,
            modelRoutes: data.modelRoutes,
          },
          { logger: jobLog.child({ chapterNumber, attempt }) },
        );

        if (result.status !== "failed") {
          // Succeeded or paused_pending_updates — stop retrying
          lastError = null;
          break;
        }

        jobLog.warn(
          { batchId, chapterNumber, attempt, status: result.status },
          "chapter returned failed status, will retry",
        );
        lastError = new Error(`chapter_${chapterNumber}_failed`);
      } catch (err) {
        lastError = err;
        result = null;
        jobLog.warn(
          { batchId, chapterNumber, attempt, err },
          "chapter threw an error, will retry",
        );
      }
    }

    // All retry attempts exhausted — still failing or erroring
    if (lastError !== null || result === null || result.status === "failed") {
      await db
        .update(batches)
        .set({
          status: "failed",
          pausedReason: `chapter_${chapterNumber}_failed`,
          completedChapters: completed,
          checkpointChapter: chapterNumber - 1,
          totalCostUsd: totalCostUsd.toFixed(6),
          finishedAt: new Date(),
        })
        .where(eq(batches.id, batchId));
      return { status: "failed", completed };
    }

    // Chapter succeeded — now it's safe to count it and persist cost
    completed++;
    totalCostUsd += result.totalCostUsd;

    if (result.status === "paused_pending_updates") {
      // Chapter was written but canon needs review — stop immediately, no retry needed
      await db
        .update(batches)
        .set({
          status: "paused",
          pausedReason: `chapter_${chapterNumber}_pending_updates`,
          completedChapters: completed,
          checkpointChapter: chapterNumber,
          totalCostUsd: totalCostUsd.toFixed(6),
        })
        .where(eq(batches.id, batchId));
      return { status: "paused", completed };
    }

    await db
      .update(batches)
      .set({
        completedChapters: completed,
        checkpointChapter: chapterNumber,
        totalCostUsd: totalCostUsd.toFixed(6),
      })
      .where(eq(batches.id, batchId));
  }

  await db
    .update(batches)
    .set({
      status: "completed",
      completedChapters: completed,
      checkpointChapter: endChapter,
      totalCostUsd: totalCostUsd.toFixed(6),
      finishedAt: new Date(),
    })
    .where(eq(batches.id, batchId));
  return { status: "completed", completed };
}
