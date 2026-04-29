import { listSeeds } from '@/lib/api/seeds';
import { SeedRow } from './SeedRow';

export default async function SeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seeds = await listSeeds(id);
  const groups = {
    pending: seeds.filter((s) => s.status === 'pending'),
    planted: seeds.filter((s) => s.status === 'planted'),
    paid_off: seeds.filter((s) => s.status === 'paid_off'),
    abandoned: seeds.filter((s) => s.status === 'abandoned'),
  };
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Planted seeds ({seeds.length})</h1>
      {(['pending', 'planted', 'paid_off', 'abandoned'] as const).map((g) => (
        <section key={g} className="mb-6">
          <h2 className="font-medium mb-2 capitalize">{g.replace('_', ' ')} ({groups[g].length})</h2>
          <ul className="space-y-2">
            {groups[g].map((s) => <SeedRow key={s.id} storyId={id} seed={s} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}