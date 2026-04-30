import Link from 'next/link';
import { listSagas } from '@/lib/api/sagas';
import { PlanSagasButton } from './PlanSagasButton';

export default async function SagasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let sagas: Awaited<ReturnType<typeof listSagas>> = [];
  let error: string | null = null;
  try {
    sagas = await listSagas(id);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Long-form structure</p>
          <h1>Sagas</h1>
          <p className="studio-subtitle">Plan major story movements before generating chapters.</p>
        </div>
        <PlanSagasButton storyId={id} />
      </header>
      {error && <p className="error">Failed to load sagas: {error}</p>}
      {sagas.length === 0 && !error && <div className="empty-state">No sagas planned yet. Click &quot;Plan sagas&quot; (uses Pro model — costs ~$0.04).</div>}
      <ul className="list-clean">
        {sagas.map((s) => (
          <li key={s.id} className="studio-card">
            <div className="studio-card-title">
              <Link href={`/stories/${id}/sagas/${s.id}` as any}>
                {s.sagaNumber + 1}. {s.title}
              </Link>
              <span className="muted">Chapters {s.startChapter}–{s.endChapter}</span>
            </div>
            <p className="muted">{s.premise}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
