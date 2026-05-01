import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { ChaptersRefreshPoller } from './chapters-refresh-poller';

interface ChapterSummary {
  id: string;
  chapterNumber: number;
  title: string | null;
  status: string;
  wordCount: number;
}

export default async function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let chapters: ChapterSummary[] = [];
  let error: string | null = null;
  try {
    const data = await apiFetch<{ chapters: ChapterSummary[] }>(`/api/stories/${id}/chapters`);
    chapters = data.chapters;
  } catch (e) {
    error = (e as Error).message;
  }

  const hasGenerating = chapters.some((ch) => ch.status === 'generating');

  return (
    <>
      <ChaptersRefreshPoller hasGenerating={hasGenerating} />
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Draft pipeline</p>
          <h1>Chapters</h1>
          <p className="studio-subtitle">Review generated chapters and continue the manuscript.</p>
        </div>
        <div className="studio-actions">
          <Link href={`/stories/${id}/chapters/generate` as any}><button className="primary">Generate Chapter</button></Link>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      {chapters.length === 0 && !error && <div className="empty-state">No chapters yet. Generate one to start.</div>}
      <div className="studio-grid">
        {chapters.map((ch) => (
          <Link key={ch.id} href={`/stories/${id}/chapters/${ch.chapterNumber}` as any} className="studio-card">
            <div className="studio-card-title">
              <strong>Ch. {ch.chapterNumber}</strong>
              <span className="status-pill">{ch.status}</span>
            </div>
            {ch.title && <p>{ch.title}</p>}
            <p className="muted" style={{ marginTop: 6 }}>{ch.wordCount} words</p>
          </Link>
        ))}
      </div>
    </>
  );
}
