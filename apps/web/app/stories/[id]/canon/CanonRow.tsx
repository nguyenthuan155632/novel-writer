'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setLocked, deleteCanonFact, type CanonFact } from '@/lib/api/canon-facts';

export function CanonRow({ storyId, fact }: { storyId: string; fact: CanonFact }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const locked = fact.locked || fact.importance === 'locked';
  const subject = [fact.subjectType, fact.subjectKey].filter(Boolean).join('/');

  const handleLock = async () => {
    setLoading(true);
    setError(null);
    try {
      await setLocked(storyId, fact.id, !locked);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      console.error('Lock error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteCanonFact(storyId, fact.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      console.error('Delete error:', e);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <li className="studio-card fact-row">
      <div className="fact-row-body">
        {subject && <div><code className="muted">{subject}</code></div>}
        <div>{fact.fact}</div>
        {error && <div className="error" style={{ fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>
      <div className="fact-row-actions">
        <button disabled={loading || confirming} onClick={handleLock} className={locked ? 'danger' : ''}>
          {locked ? 'Unlock' : 'Lock'}
        </button>
        {!locked && (
          confirming ? (
            <>
              <button disabled={loading} className="danger" onClick={handleDelete}>
                Confirm
              </button>
              <button disabled={loading} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button disabled={loading} className="danger" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )
        )}
      </div>
    </li>
  );
}
