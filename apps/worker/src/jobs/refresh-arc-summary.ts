import type { Logger } from 'pino';
import type { RefreshArcSummaryJob } from '../queues.js';

export async function runRefreshArcSummaryJob(
  data: RefreshArcSummaryJob,
  ctx: { logger: Logger }
): Promise<{ status: 'skipped' }> {
  ctx.logger.warn({ data }, 'refresh-arc-summary not implemented in Plan 2 — see Plan 3');
  return { status: 'skipped' };
}