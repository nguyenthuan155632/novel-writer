import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

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

  return (
    <div>
      <h1>Chapters</h1>
      <p><Link href={`/stories/${id}/chapters/generate` as any}><button className="primary">+ Generate Chapter</button></Link></p>
      {error && <p className="error">{error}</p>}
      {chapters.length === 0 && !error && <p className="muted">No chapters yet. Generate one to start.</p>}
      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        {chapters.map((ch) => (
          <Link key={ch.id} href={`/stories/${id}/chapters/${ch.chapterNumber}` as any} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              <strong>Ch. {ch.chapterNumber}</strong>
              {ch.title && <> — {ch.title}</>} <span className="muted">[{ch.status}]</span>
              <span className="muted" style={{ marginLeft: 8 }}>{ch.wordCount} words</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}