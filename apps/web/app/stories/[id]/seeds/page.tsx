import { listSeeds } from '@/lib/api/seeds';
import { SeedRow } from './SeedRow';

export default async function SeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let seeds: Awaited<ReturnType<typeof listSeeds>> = [];
  let error: string | null = null;
  try {
    seeds = await listSeeds(id);
  } catch (e) {
    error = (e as Error).message;
  }
  const groups = {
    pending: seeds.filter((s) => s.status === 'pending'),
    planted: seeds.filter((s) => s.status === 'planted'),
    paid_off: seeds.filter((s) => s.status === 'paid_off'),
    abandoned: seeds.filter((s) => s.status === 'abandoned'),
  };
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Foreshadowing</p>
          <h1>Planted seeds ({seeds.length})</h1>
          <p className="studio-subtitle">Track unresolved, planted, paid-off, and abandoned narrative seeds.</p>
        </div>
      </header>
      {error && <p className="error">Failed to load seeds: {error}</p>}
      {(['pending', 'planted', 'paid_off', 'abandoned'] as const).map((g) => (
        <section key={g} className="studio-panel">
          <h2 style={{ marginTop: 0, textTransform: 'capitalize' }}>{g.replace('_', ' ')} ({groups[g].length})</h2>
          <ul className="list-clean">
            {groups[g].map((s) => <SeedRow key={s.id} storyId={id} seed={s} />)}
          </ul>
        </section>
      ))}
    </>
  );
}
