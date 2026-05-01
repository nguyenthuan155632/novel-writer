import { apiFetch } from "@/lib/api-client";
import { ApprovalButton, RejectionButton } from "./update-actions";

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

export default async function PendingUpdatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Canon queue</p>
          <h1>Pending Canon Updates</h1>
          <p className="studio-subtitle">
            Approve or reject proposed continuity changes from generated
            chapters.
          </p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      {updates.length === 0 && !error && (
        <div className="empty-state">No pending updates.</div>
      )}
      <div className="studio-grid">
        {updates.map((u) => (
          <div key={u.id} className="studio-panel">
            <div className="studio-card-title">
              <strong>{u.updateType}</strong>
              <span className="status-pill">{u.conflictStatus}</span>
            </div>
            <p className="muted">
              Target: {u.targetTable}
              {u.targetId ? ` / ${u.targetId}` : ""}
            </p>
            <details style={{ marginTop: 8 }}>
              <summary>Payload</summary>
              <pre
                style={{
                  fontSize: 12,
                  overflow: "auto",
                  maxHeight: 200,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(u.payload, null, 2)}
              </pre>
            </details>
            {u.conflictReasons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Conflicts:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {u.conflictReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="button-row" style={{ marginTop: 12 }}>
              <ApprovalButton storyId={id} updateId={u.id} />
              <RejectionButton storyId={id} updateId={u.id} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
