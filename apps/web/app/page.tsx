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
    <div>
      <h1>Stories</h1>
      <p><Link href="/stories/new"><button className="primary">+ New Story</button></Link></p>
      {error && <p className="error">Failed to load: {error}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {stories.map((s) => (
          <Link key={s.id} href={`/stories/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              <strong>{s.title}</strong> <span className="muted">[{s.status}]</span>
              <div className="muted" style={{ marginTop: 4 }}>{s.premise.slice(0, 140)}...</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {s.genre} · target {s.targetChapterCount} chương
              </div>
            </div>
          </Link>
        ))}
        {stories.length === 0 && !error && <p className="muted">No stories yet.</p>}
      </div>
    </div>
  );
}