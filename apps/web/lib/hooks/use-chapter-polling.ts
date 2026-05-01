'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchChapterStatus, type JobStatus } from '@/lib/api/chapters';

const POLL_INTERVAL_MS = 3000;

export function useChapterPolling(
  storyId: string,
  chapterNumber: number,
  enabled: boolean,
) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const result = await fetchChapterStatus(storyId, chapterNumber);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [storyId, chapterNumber]);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      setError(null);
      return;
    }

    // Poll immediately on enable
    poll();

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  const isActive =
    status != null &&
    status.state !== 'completed' &&
    status.state !== 'failed' &&
    status.state !== 'unknown';

  return { status, error, isActive, poll };
}
