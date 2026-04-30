import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface Story {
  id: string;
  title: string;
  premise: string;
  genre: string;
  status: string;
  targetChapterCount: number;
  createdAt: string;
}

export default async function Home() {
  let stories: Story[] = [];
  let error: string | null = null;
  try {
    stories = await apiFetch<Story[]>('/api/stories');
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Writing Studio</p>
          <h1>Stories</h1>
          <p className="studio-subtitle">Shape long-form fiction from premise to chapters, canon, and production review.</p>
        </div>
        <div className="studio-actions">
          <Link href="/stories/new"><button className="primary">New Story</button></Link>
        </div>
      </header>
      {error && <p className="error">Failed to load: {error}</p>}
      <div className="studio-grid">
        {stories.map((s) => (
          <Link key={s.id} href={`/stories/${s.id}`} className="studio-card">
            <div className="studio-card-title">
              <strong>{s.title}</strong>
              <span className="status-pill">{s.status}</span>
            </div>
            <p className="muted">{s.premise.slice(0, 140)}...</p>
            <div className="meta-line" style={{ marginTop: 10 }}>
                {s.genre} · target {s.targetChapterCount} chương
            </div>
          </Link>
        ))}
        {stories.length === 0 && !error && <div className="empty-state">No stories yet.</div>}
      </div>
    </div>
  );
}
