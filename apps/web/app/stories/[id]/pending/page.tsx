import { apiFetch } from '@/lib/api-client';
import { ApprovalButton, RejectionButton } from './update-actions';

interface PendingCanonUpdate {
  id: string;
  storyId: string;
  chapterId: string;
  updateType: string;
  targetTable: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  conflictStatus: string;
  conflictReasons: string[];
  resolution: string;
  reviewedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default async function PendingUpdatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let updates: PendingCanonUpdate[] = [];
  let error: string | null = null;
  try {
    const data = await apiFetch<{ pendingUpdates: PendingCanonUpdate[] }>(
      `/api/stories/${id}/pending-updates?resolution=pending`,
    );
    updates = data.pendingUpdates;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      <h1>Pending Canon Updates</h1>
      {error && <p className="error">{error}</p>}
      {updates.length === 0 && !error && <p className="muted">No pending updates.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {updates.map((u) => (
          <div key={u.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{u.updateType}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{u.conflictStatus}</span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Target: {u.targetTable}{u.targetId ? ` / ${u.targetId}` : ''}
            </p>
            <details style={{ marginTop: 8 }}>
              <summary>Payload</summary>
              <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(u.payload, null, 2)}
              </pre>
            </details>
            {u.conflictReasons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Conflicts:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {u.conflictReasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <ApprovalButton storyId={id} updateId={u.id} />
              <RejectionButton storyId={id} updateId={u.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}