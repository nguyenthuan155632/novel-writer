import Link from 'next/link';
import { listSagas } from '@/lib/api/sagas';
import { PlanSagasButton } from './PlanSagasButton';

export default async function SagasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sagas = await listSagas(id);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Sagas</h1>
        <PlanSagasButton storyId={id} />
      </div>
      {sagas.length === 0 && <p className="text-gray-500 text-sm">No sagas planned yet. Click &quot;Plan sagas&quot; (uses Pro model — costs ~$0.04).</p>}
      <ul className="space-y-2">
        {sagas.map((s) => (
          <li key={s.id} className="border rounded p-3">
            <div className="flex justify-between text-sm">
              <Link href={`/stories/${id}/sagas/${s.id}` as any} className="font-semibold text-blue-700">
                {s.sagaNumber + 1}. {s.title}
              </Link>
              <span className="text-gray-500">ch {s.startChapter}–{s.endChapter}</span>
            </div>
            <p className="text-sm mt-1 text-gray-700">{s.premise}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}