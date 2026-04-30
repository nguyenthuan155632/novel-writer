import { apiFetch } from '@/lib/api-client';
import { RegenerateButton } from './regenerate-button';

interface ChapterDetail {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string | null;
  content: string | null;
  summary: string | null;
  status: string;
  wordCount: number;
  validationStatus: string;
  packetAuditStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string; chapterNumber: string }>;
}) {
  const { id, chapterNumber } = await params;
  const num = Number(chapterNumber);
  let chapter: ChapterDetail | null = null;
  let error: string | null = null;
  try {
    const data = await apiFetch<{ chapter: ChapterDetail }>(
      `/api/stories/${id}/chapters/${num}`,
    );
    chapter = data.chapter;
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) return <p className="error">{error}</p>;
  if (!chapter) return <div className="empty-state">Chapter not found.</div>;
  const canRetry =
    chapter.status === 'failed' ||
    chapter.status === 'paused_pending_updates' ||
    (chapter.status === 'generating' && chapter.validationStatus === 'failed');

  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Chapter {chapter.chapterNumber}</p>
          <h1>{chapter.title ?? `Ch. ${chapter.chapterNumber}`}</h1>
          <p className="meta-line">
            <span className="status-pill">{chapter.status}</span>
            <span>{chapter.wordCount} words</span>
            <span>Validation: {chapter.validationStatus}</span>
            <span>Packet: {chapter.packetAuditStatus}</span>
          </p>
        </div>
        {canRetry && (
          <RegenerateButton storyId={id} chapterNumber={chapter.chapterNumber} />
        )}
      </header>
      {chapter.summary && (
        <details open style={{ marginBottom: 16 }}>
          <summary><strong>Summary</strong></summary>
          <div className="studio-panel" style={{ marginTop: 8 }}>
            <p className="prose-panel">{chapter.summary}</p>
          </div>
        </details>
      )}
      {chapter.content ? (
        <div className="studio-panel">
          <div className="prose-panel scroll-panel">
            {chapter.content}
          </div>
        </div>
      ) : (
        <div className="empty-state">No content yet.</div>
      )}
    </>
  );
}
