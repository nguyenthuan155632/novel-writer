'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChapterPolling } from '@/lib/hooks/use-chapter-polling';

interface ChapterStatusPollerProps {
  storyId: string;
  chapterNumber: number;
  initialStatus: string;
}

export function ChapterStatusPoller({ storyId, chapterNumber, initialStatus }: ChapterStatusPollerProps) {
  const router = useRouter();
  const isGenerating =
    initialStatus === 'generating' ||
    initialStatus === 'waiting' ||
    initialStatus === 'paused_pending_updates';

  const { status, isActive } = useChapterPolling(storyId, chapterNumber, isGenerating);

  useEffect(() => {
    if (!isActive && status) {
      const done = status.state === 'completed' || status.state === 'failed';
      if (done) {
        router.refresh();
      }
    }
  }, [isActive, status, router]);

  if (!isGenerating) return null;

  return (
    <div className="studio-panel" style={{ marginBottom: 16 }}>
      <p style={{ margin: 0 }}>
        <span className="loading-spinner" style={{ marginRight: 8 }}></span>
        Generating chapter... {status ? `(${status.state})` : '(checking status)'}
      </p>
    </div>
  );
}
