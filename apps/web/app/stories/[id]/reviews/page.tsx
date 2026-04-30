import { listReviews } from '@/lib/api/reviews';

export default async function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let reviews: Awaited<ReturnType<typeof listReviews>> = [];
  let error: string | null = null;
  try {
    reviews = await listReviews(id);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Quality gate</p>
          <h1>High-stakes reviews</h1>
          <p className="studio-subtitle">Inspect model review outcomes for risky chapter decisions.</p>
        </div>
      </header>
      {error && <p className="error">Failed to load reviews: {error}</p>}
      {reviews.length === 0 && !error && <div className="empty-state">No reviews yet.</div>}
      <ul className="list-clean">
        {reviews.map((r) => (
          <li key={r.id} className="studio-panel">
            <div className="studio-card-title">
              <span>Trigger: <code>{r.triggerReason}</code></span>
              <span className={`status-pill ${r.approve === 'true' ? 'success' : 'danger'}`}>{r.approve === 'true' ? 'approved' : 'not approved'}</span>
            </div>
            <p className="muted">${Number(r.costUsd).toFixed(4)} · {new Date(r.createdAt).toLocaleString()}</p>
            {r.concerns.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h3>Concerns</h3>
                <ul>
                  {r.concerns.map((c, i) => (
                    <li key={i}><span className="status-pill warning">{c.severity}/{c.category}</span> {c.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.recommendedActions.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h3>Recommended actions</h3>
                <ul>
                  {r.recommendedActions.map((a, i) => <li key={i}><code>{a.action}</code>: {a.rationale}</li>)}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
