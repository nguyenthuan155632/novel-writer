'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface GenerateFormProps {
  storyId: string;
}

export function GenerateForm({ storyId }: GenerateFormProps) {
  const router = useRouter();
  const [chapterNumber, setChapterNumber] = useState(1);
  const [mode, setMode] = useState<'safe' | 'semi_auto' | 'full_auto'>('safe');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const result = await apiFetch<{ jobId: string }>(`/api/stories/${storyId}/chapters/generate`, {
        method: 'POST',
        body: JSON.stringify({ chapterNumber, mode }),
      });
      setJobId(result.jobId);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (jobId) {
    return (
      <div className="card">
        <p>Job enqueued! <strong>{jobId}</strong></p>
        <p className="muted">Check the chapter list for updates, or refresh this page.</p>
        <button onClick={() => router.push(`/stories/${storyId}/chapters` as any)}>Go to Chapters</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <label>Chapter Number</label>
      <input
        type="number"
        min={1}
        value={chapterNumber}
        onChange={(e) => setChapterNumber(Number(e.target.value))}
      />
      <label>Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as 'safe' | 'semi_auto' | 'full_auto')}>
        <option value="safe">Safe</option>
        <option value="semi_auto">Semi-Auto</option>
        <option value="full_auto">Full Auto</option>
      </select>
      <button className="primary" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? 'Enqueuing...' : 'Generate Chapter'}
      </button>
      {err && <p className="error">{err}</p>}
    </form>
  );
}