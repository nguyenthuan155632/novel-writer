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
    <div>
      <h1>{s.title}</h1>
      <p className="muted">Genre: {s.genre} · Tone: {s.tone ?? '—'} · Target: {s.targetChapterCount} chương · Status: {s.status}</p>
      <ExportButtons storyId={id} />
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Premise</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{s.premise}</p>
      </div>
    </div>
  );
}