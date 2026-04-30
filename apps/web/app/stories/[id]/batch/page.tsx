import { listBatches } from '@/lib/api/batches';
import { StartBatchForm } from './StartBatchForm';

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let batches: Awaited<ReturnType<typeof listBatches>> = [];
  let error: string | null = null;
  try {
    batches = await listBatches(id);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Batch drafting</p>
          <h1>Batch generation</h1>
          <p className="studio-subtitle">Queue chapter ranges and monitor batch history.</p>
        </div>
      </header>
      <StartBatchForm storyId={id} />
      {error && <p className="error">Failed to load batches: {error}</p>}
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>History</h2>
      {batches.length === 0 && !error && <div className="empty-state">No batch history yet.</div>}
      <ul className="list-clean">
        {batches.map((b) => (
          <li key={b.id} className="studio-card">
            <div className="studio-card-title">
              <span>ch {b.startChapter}–{b.endChapter} · mode={b.mode}</span>
              <span className="status-pill">{b.status}</span>
            </div>
            <p className="muted">{b.completedChapters} done · ${Number(b.totalCostUsd).toFixed(4)}</p>
            {b.pausedReason && <p className="error">paused: {b.pausedReason}</p>}
          </li>
        ))}
      </ul>
      </section>
    </>
  );
}
