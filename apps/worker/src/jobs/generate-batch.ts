import { getDb } from '@novel/db';
import { batches } from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@novel/core/logger';

const log = createLogger('generate-batch');

export interface GenerateBatchJobData {
  batchId: string;
  storyId: string;
  startChapter: number;
  endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
}

export async function runGenerateBatchJob(data: GenerateBatchJobData, ctx: { logger: any }): Promise<{ status: string; completed: number }> {
  const db = getDb();
  const { batchId, storyId, startChapter, endChapter } = data;

  log.info({ batchId, storyId, startChapter, endChapter }, 'batch job started');

  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch || batch.status === 'cancelled') {
    return { status: 'cancelled', completed: 0 };
  }

  await db.update(batches)
    .set({ status: 'completed', finishedAt: new Date() })
    .where(eq(batches.id, batchId));

  const completed = endChapter - startChapter + 1;
  return { status: 'completed', completed };
}