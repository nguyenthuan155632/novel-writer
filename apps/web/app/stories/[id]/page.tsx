import { apiFetch } from '@/lib/api-client';
import { ExportButtons } from './export-buttons';

interface Story {
  id: string; title: string; premise: string; genre: string;
  tone: string | null; targetChapterCount: number; status: string; createdAt: string;
}

export default async function StoryOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await apiFetch<Story>(`/api/stories/${id}`);
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Story workspace</p>
          <h1>{s.title}</h1>
          <p className="meta-line">
            <span>{s.genre}</span>
            <span>· Tone: {s.tone ?? '—'}</span>
            <span>· Target: {s.targetChapterCount} chương</span>
            <span className="status-pill">{s.status}</span>
          </p>
        </div>
        <ExportButtons storyId={id} />
      </header>
      <div className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Premise</h2>
        <p className="prose-panel">{s.premise}</p>
      </div>
    </>
  );
}
