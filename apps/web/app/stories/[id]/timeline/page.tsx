import Link from 'next/link';
import { getTimeline } from '@/lib/api/timeline';

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let rows: Awaited<ReturnType<typeof getTimeline>> = [];
  let error: string | null = null;
  try {
    rows = await getTimeline(id);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Narrative timeline</p>
          <h1>Timeline ({rows.length} chapters)</h1>
          <p className="studio-subtitle">Follow the story spine through generated chapter summaries.</p>
        </div>
      </header>
      {error && <p className="error">Failed to load timeline: {error}</p>}
      {rows.length === 0 && !error && <div className="empty-state">No timeline yet.</div>}
      <ol className="timeline-list studio-panel">
        {rows.map((r) => (
          <li key={r.number} className="timeline-item py-2">
            <Link href={`/stories/${id}/chapters/${r.number}` as any}>
              Ch {r.number}: {r.title}
            </Link>
            <p className="muted">{r.summary}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
