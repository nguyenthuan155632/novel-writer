import type { ThreadCompact } from './types.js';

/** A thread is overdue when past its planned resolution chapter, or (unplanned) stale for > heuristicGap chapters. */
export function isThreadOverdue(
  thread: ThreadCompact,
  chapterNumber: number,
  heuristicGap = 10,
): boolean {
  if (thread.state === 'resolved') return false;
  if (thread.plannedResolutionChapter != null) {
    return chapterNumber > thread.plannedResolutionChapter;
  }
  return thread.introducedChapter < chapterNumber - heuristicGap;
}
