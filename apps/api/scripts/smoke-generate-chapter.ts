/**
 * Smoke test for chapter generation queue.
 *
 * USAGE:
 *   pnpm --filter @novel/api tsx scripts/smoke-generate-chapter.ts <storyId> <chapterNumber>
 *
 * Reads REDIS_URL and DATABASE_URL from env.
 * Requires a running Redis instance and the generate-chapter worker.
 */
import { getDb } from '@novel/db';
import { chapters } from '@novel/db/schema';
import { eq, and } from 'drizzle-orm';
import { enqueueGenerateChapter, getGenerateChapterStatus } from '../src/services/queue-client.js';

const storyId = process.argv[2];
const chapterNum = process.argv[3];

if (!storyId || !chapterNum) {
  console.error('Usage: tsx scripts/smoke-generate-chapter.ts <storyId> <chapterNumber>');
  process.exit(1);
}

const chapterNumber = Number(chapterNum);
if (Number.isNaN(chapterNumber) || chapterNumber < 1) {
  console.error('chapterNumber must be a positive integer');
  process.exit(1);
}

const db = getDb();
const [existing] = await db
  .select()
  .from(chapters)
  .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)))
  .limit(1);

if (existing) {
  console.log(`Chapter ${chapterNumber} already exists (status: ${existing.status})`);
  console.log('Re-enqueuing anyway...');
}

const { jobId } = await enqueueGenerateChapter({
  storyId,
  chapterNumber,
  mode: 'safe',
});
console.log(`Job enqueued: ${jobId}`);

console.log('Polling status (Ctrl+C to stop)...');
setInterval(async () => {
  const status = await getGenerateChapterStatus(storyId, chapterNumber);
  if (!status) {
    console.log('No job found');
  } else {
    console.log(`State: ${status.state}, Progress: ${JSON.stringify(status.progress)}`);
    if (status.state === 'completed' || status.state === 'failed') {
      process.exit(status.state === 'completed' ? 0 : 1);
    }
  }
}, 3000);