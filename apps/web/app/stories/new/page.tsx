'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export default function NewStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState('xianxia_fantasy');
  const [tone, setTone] = useState('');
  const [target, setTarget] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ title, premise, genre, tone: tone || null, targetChapterCount: target }),
      });
      router.push(`/stories/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>New Story</h1>
      <form onSubmit={submit} style={{ maxWidth: 700 }}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Premise (≥ 20 chars)</label>
        <textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={6} required minLength={20} />

        <label>Genre</label>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} />

        <label>Tone (optional)</label>
        <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="vd: dark, slow-burn" />

        <label>Target chapter count</label>
        <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 16 }}>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}