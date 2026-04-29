'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export function RegenerateButton({
  storyId,
  chapterNumber,
}: {
  storyId: string;
  chapterNumber: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [missingPlanning, setMissingPlanning] = useState<string[]>([]);

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setMissingPlanning([]);

    try {
      await apiFetch(`/api/stories/${storyId}/chapters/generate`, {
        method: 'POST',
        body: JSON.stringify({ chapterNumber, mode: 'safe' }),
      });
      setSuccess('Re-generation queued. Refreshing chapter status...');
      router.refresh();
    } catch (e) {
      const message = (e as Error).message;
      const parsed = parsePlanningRequired(message);
      if (parsed) {
        setMissingPlanning(parsed);
        setError('Chapter planning is incomplete.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ margin: '16px 0' }}>
      <button className="primary" type="button" onClick={handleRegenerate} disabled={loading}>
        {loading ? 'Re-enqueuing...' : 'Re-generate Chapter'}
      </button>
      {success && <p style={{ color: 'var(--color-success, #0a7f3f)' }}>{success}</p>}
      {error && <p className="error">{error}</p>}
      {missingPlanning.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ marginTop: 0 }}>Finish these steps first:</p>
          <ul>
            {missingPlanning.includes('bible') && <li><Link href={`/stories/${storyId}/bible` as any}>Generate Story Bible</Link></li>}
            {missingPlanning.includes('saga') && <li><Link href={`/stories/${storyId}/sagas` as any}>Plan Sagas</Link></li>}
            {missingPlanning.includes('arc') && <li>Open a saga from <Link href={`/stories/${storyId}/sagas` as any}>Sagas</Link>, then Plan Arcs.</li>}
          </ul>
        </div>
      )}
    </div>
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
