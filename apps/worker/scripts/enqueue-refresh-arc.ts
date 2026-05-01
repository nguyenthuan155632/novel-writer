import '@novel/core/load-env';
import { enqueueRefreshArcSummary } from '../src/services/queue-publisher.js';

const [storyId, arcId, traceIdArg] = process.argv.slice(2);

if (!storyId || !arcId) {
  console.error('Usage: tsx scripts/enqueue-refresh-arc.ts <storyId> <arcId> [traceId]');
  process.exit(1);
}

const traceId = traceIdArg ?? `manual-${Date.now()}`;

(async () => {
  try {
    console.log('Enqueuing refresh-arc-summary job with', { storyId, arcId, traceId });
    const jobId = await enqueueRefreshArcSummary({ storyId, arcId, traceId });
    console.log('Enqueued job id:', jobId);
    process.exit(0);
  } catch (err) {
    console.error('Failed to enqueue refresh-arc-summary:', err);
    process.exit(1);
  }
})();
