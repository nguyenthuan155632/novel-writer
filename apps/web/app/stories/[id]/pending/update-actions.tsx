'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export function ApprovalButton({ storyId, updateId }: { storyId: string; updateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/pending-updates/${updateId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ resolution: 'approved' }),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="primary" onClick={approve} disabled={loading}>
        {loading ? 'Approving...' : 'Approve'}
      </button>
      {err && <span className="error" style={{ fontSize: 12 }}>{err}</span>}
    </>
  );
}

export function RejectionButton({ storyId, updateId }: { storyId: string; updateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showInput, setShowInput] = useState(false);

  async function reject() {
    if (!reason.trim()) { setShowInput(true); return; }
    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/pending-updates/${updateId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!showInput ? (
        <button onClick={() => setShowInput(true)} disabled={loading}>Reject</button>
      ) : (
        <div className="button-row">
          <input
            placeholder="Reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: 180 }}
          />
          <button onClick={reject} disabled={loading || !reason.trim()}>
            {loading ? 'Rejecting...' : 'Confirm'}
          </button>
          <button onClick={() => setShowInput(false)}>Cancel</button>
        </div>
      )}
      {err && <span className="error" style={{ fontSize: 12 }}>{err}</span>}
    </>
  );
}
