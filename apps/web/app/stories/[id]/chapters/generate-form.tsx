'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface GenerateFormProps {
  storyId: string;
  initialChapterNumber?: number;
}

export function GenerateForm({ storyId, initialChapterNumber }: GenerateFormProps) {
  const router = useRouter();
  const [chapterNumber, setChapterNumber] = useState(initialChapterNumber ?? 1);
  const [mode, setMode] = useState<'safe' | 'semi_auto' | 'full_auto'>('semi_auto');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [missingPlanning, setMissingPlanning] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMissingPlanning([]);
    try {
      const result = await apiFetch<{ jobId: string }>(`/api/stories/${storyId}/chapters/generate`, {
        method: 'POST',
        body: JSON.stringify({ chapterNumber, mode }),
      });
      setJobId(result.jobId);
    } catch (e) {
      const message = (e as Error).message;
      const parsed = parsePlanningRequired(message);
      if (parsed) {
        setMissingPlanning(parsed);
        setErr('Chapter planning is incomplete.');
      } else {
        setErr(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (jobId) {
    return (
      <div className="studio-panel">
        <p>Job enqueued! <strong>{jobId}</strong></p>
        <p className="muted">Check the chapter list for updates, or refresh this page.</p>
        <button onClick={() => router.push(`/stories/${storyId}/chapters` as any)}>Go to Chapters</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="studio-panel form-grid">
      <div className="field-group">
        <label>Chapter Number</label>
        <input
          type="number"
          min={1}
          value={chapterNumber}
          onChange={(e) => setChapterNumber(Number(e.target.value))}
        />
      </div>
      <div className="field-group">
        <label>Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as 'safe' | 'semi_auto' | 'full_auto')}>
          <option value="safe">Safe</option>
          <option value="semi_auto">Semi-Auto</option>
          <option value="full_auto">Full Auto</option>
        </select>
      </div>
      <button className="primary" type="submit" disabled={loading}>
        {loading ? 'Enqueuing...' : 'Generate Chapter'}
      </button>
      {err && <p className="error">{err}</p>}
      {missingPlanning.length > 0 && (
        <div className="studio-panel">
          <p style={{ marginTop: 0 }}>Finish these steps first:</p>
          <ul>
            {missingPlanning.includes('bible') && <li><Link href={`/stories/${storyId}/bible` as any}>Generate Story Bible</Link></li>}
            {missingPlanning.includes('saga') && <li><Link href={`/stories/${storyId}/sagas` as any}>Plan Sagas</Link></li>}
            {missingPlanning.includes('arc') && <li>Open a saga from <Link href={`/stories/${storyId}/sagas` as any}>Sagas</Link>, then Plan Arcs.</li>}
          </ul>
        </div>
      )}
    </form>
  );
}

function parsePlanningRequired(message: string): string[] | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return null;

  try {
    const payload = JSON.parse(message.slice(jsonStart)) as { error?: string; missing?: string[] };
    if (payload.error !== 'planning_required' || !Array.isArray(payload.missing)) return null;
    return payload.missing;
  } catch {
    return null;
  }
}
