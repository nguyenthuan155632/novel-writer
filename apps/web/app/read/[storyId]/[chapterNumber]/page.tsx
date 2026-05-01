import type { ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { ChapterDetail } from '@/lib/api/chapters';
import { ReaderView } from './ReaderView';

interface Story {
  id: string;
  title: string;
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}) {
  const { storyId, chapterNumber } = await params;
  const chapterNum = Number(chapterNumber);

  if (!Number.isFinite(chapterNum) || chapterNum <= 0) {
    return renderFallback('Invalid chapter number.');
  }

  let story: Story | null = null;
  let chapter: ChapterDetail | null = null;
  let error: string | null = null;

  try {
    const [storyRes, chapterRes] = await Promise.all([
      apiFetch<Story>(`/api/stories/${storyId}`),
      apiFetch<{ chapter: ChapterDetail }>(`/api/stories/${storyId}/chapters/${chapterNum}`),
    ]);
    story = storyRes;
    chapter = chapterRes.chapter;
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !story || !chapter) {
    return renderFallback(error ?? 'Chapter not found.');
  }

  return <ReaderView storyId={storyId} storyTitle={story.title} chapter={chapter} />;
}

function renderFallback(message: string): ReactNode {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#fbf8f1',
        color: '#211f1b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Georgia, "Times New Roman", serif',
        textAlign: 'center',
      }}
    >
      <p>{message}</p>
    </div>
  );
}
