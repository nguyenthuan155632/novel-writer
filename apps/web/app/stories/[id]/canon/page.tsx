import { listCanonFacts } from '@/lib/api/canon-facts';
import { CanonRow } from './CanonRow';

export default async function CanonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let facts: Awaited<ReturnType<typeof listCanonFacts>> = [];
  let error: string | null = null;
  try {
    facts = await listCanonFacts(id);
  } catch (e) {
    error = (e as Error).message;
  }
  const locked = facts.filter((f) => f.locked || f.importance === 'locked');
  const normal = facts.filter((f) => !f.locked && f.importance !== 'locked');
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Continuity</p>
          <h1>Canon facts ({facts.length})</h1>
          <p className="studio-subtitle">Review locked and normal facts used for narrative consistency.</p>
        </div>
      </header>
      {error && <p className="error">Failed to load canon facts: {error}</p>}
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Locked ({locked.length})</h2>
        {locked.length === 0 && <div className="empty-state compact">No locked facts.</div>}
        <ul className="list-clean">{locked.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Normal ({normal.length})</h2>
        {normal.length === 0 && !error && <div className="empty-state compact">No normal facts.</div>}
        <ul className="list-clean">{normal.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
    </>
  );
}
