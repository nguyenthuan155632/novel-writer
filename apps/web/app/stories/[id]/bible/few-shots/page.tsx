'use client';

import { useState, useEffect, use } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

interface BibleResponse {
  styleFewShots: { excerpt: string; sourceChapter?: number }[];
}

export default function FewShotsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [shots, setShots] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/stories/${id}/bible`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json() as Promise<BibleResponse>;
      })
      .then((bible) => {
        const existing = (bible.styleFewShots ?? []).map((s) => s.excerpt);
        setShots(existing.length > 0 ? existing : ['']);
      })
      .catch(() => {
        // bible not found or fetch error — start with empty
        setShots(['']);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function addShot() {
    if (shots.length < 5) setShots([...shots, '']);
  }

  function removeLast() {
    if (shots.length > 1) setShots(shots.slice(0, -1));
  }

  function updateShot(index: number, value: string) {
    const next = [...shots];
    next[index] = value;
    setShots(next);
  }

  async function save() {
    setMessage(null);
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/stories/${id}/bible/style-few-shots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fewShots: shots }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`API ${r.status}: ${text}`);
      }
      setMessage({
        type: 'success',
        text: 'Saved. Bible version bumped — HOT cache will refresh on next chapter.',
      });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Style Few-Shots</h2>
      <p style={{ marginBottom: 12, color: '#666' }}>
        Up to 5 example passages (20–2000 chars each) used to guide chapter style.
      </p>

      {shots.map((shot, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <label>Shot {i + 1}</label>
          <textarea
            rows={6}
            value={shot}
            onChange={(e) => updateShot(i, e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
            placeholder="Paste an example passage here..."
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={addShot} disabled={shots.length >= 5}>
          Add another
        </button>
        <button onClick={removeLast} disabled={shots.length <= 1}>
          Remove last
        </button>
      </div>

      {message && (
        <p
          style={{
            color: message.type === 'success' ? 'green' : 'red',
            marginBottom: 12,
          }}
        >
          {message.text}
        </p>
      )}

      <button className="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
