import { getArc } from '@/lib/api/arcs';

export default async function ArcDetail({ params }: { params: Promise<{ id: string; arcId: string }> }) {
  const { id, arcId } = await params;
  let arc: Awaited<ReturnType<typeof getArc>> | null = null;
  let error: string | null = null;
  try {
    arc = await getArc(id, arcId);
  } catch (e) {
    error = (e as Error).message;
  }
  if (!arc) {
    return (
      <>
        <header className="studio-header">
          <div>
            <p className="studio-kicker">Arc</p>
            <h1>Arc</h1>
          </div>
        </header>
        {error && <p className="error">Failed to load arc: {error}</p>}
      </>
    );
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Arc</p>
          <h1>{arc.title}</h1>
          <p className="meta-line">Chapters {arc.startChapter}–{arc.endChapter} · summary v{arc.summaryVersion}</p>
        </div>
      </header>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Premise</h2>
        <p>{arc.premise}</p>
        <h2>Expected changes</h2>
        <ul>{arc.expectedChanges.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <h2>Seeds to resolve in arc</h2>
        <ul>{arc.seedsToResolveInArc.map((k) => <li key={k}><code>{k}</code></li>)}</ul>
        <h2>Rolling summary</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{arc.rollingSummary ?? '(not generated)'}</pre>
      </section>
    </>
  );
}
