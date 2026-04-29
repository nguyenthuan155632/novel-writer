import { listCanonFacts } from '@/lib/api/canon-facts';
import { CanonRow } from './CanonRow';

export default async function CanonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facts = await listCanonFacts(id);
  const locked = facts.filter((f) => f.locked || f.importance === 'locked');
  const normal = facts.filter((f) => !f.locked && f.importance !== 'locked');
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Canon facts ({facts.length})</h1>
      <section className="mb-6">
        <h2 className="font-medium mb-2">Locked ({locked.length})</h2>
        <ul className="space-y-2">{locked.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
      <section>
        <h2 className="font-medium mb-2">Normal ({normal.length})</h2>
        <ul className="space-y-2">{normal.map((f) => <CanonRow key={f.id} storyId={id} fact={f} />)}</ul>
      </section>
    </div>
  );
}