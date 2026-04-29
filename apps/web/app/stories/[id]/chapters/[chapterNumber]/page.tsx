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
  if (!chapter) return <p>Chapter not found.</p>;
  const canRetry =
    chapter.status === 'failed' ||
    chapter.status === 'paused_pending_updates' ||
    (chapter.status === 'generating' && chapter.validationStatus === 'failed');

  return (
    <div>
      <h1>Ch. {chapter.chapterNumber}{chapter.title ? ` — ${chapter.title}` : ''}</h1>
      <p className="muted">
        Status: {chapter.status} · Words: {chapter.wordCount} · Validation: {chapter.validationStatus} · Packet: {chapter.packetAuditStatus}
      </p>
      {canRetry && (
        <RegenerateButton storyId={id} chapterNumber={chapter.chapterNumber} />
      )}
      {chapter.summary && (
        <details open style={{ marginBottom: 16 }}>
          <summary><strong>Summary</strong></summary>
          <div className="card" style={{ marginTop: 8 }}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{chapter.summary}</p>
          </div>
        </details>
      )}
      {chapter.content ? (
        <div className="card">
          <div style={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto' }}>
            {chapter.content}
          </div>
        </div>
      ) : (
        <p className="muted">No content yet.</p>
      )}
    </div>
  );
}