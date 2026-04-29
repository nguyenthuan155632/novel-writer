import Link from 'next/link';
import { listArcs } from '@/lib/api/arcs';
import { getSaga } from '@/lib/api/sagas';
import { PlanArcsButton } from './PlanArcsButton';

export default async function SagaDetail({ params }: { params: Promise<{ id: string; sagaId: string }> }) {
  const { id, sagaId } = await params;
  const [saga, arcs] = await Promise.all([
    getSaga(id, sagaId),
    listArcs(id, sagaId),
  ]);
  const defaultCurrentState = [
    `Saga: ${saga.title}`,
    saga.premise ? `Premise: ${saga.premise}` : '',
    `Chapter range: ${saga.startChapter ?? '?'}-${saga.endChapter ?? '?'}`,
    saga.rollingSummary ? `Rolling summary: ${saga.rollingSummary}` : 'No chapters have been generated yet.',
  ].filter(Boolean).join('\n\n');

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">{saga.title}</h1>
      <p className="text-sm text-gray-500 mb-4">Chapters {saga.startChapter}–{saga.endChapter} · summary v{saga.summaryVersion}</p>
      <h2 className="font-medium mt-4">Premise</h2>
      <p className="text-sm">{saga.premise}</p>
      <h2 className="font-medium mt-4">Turning points</h2>
      <ol className="list-decimal pl-6 text-sm">
        {saga.expectedTurningPoints.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
      <h2 className="font-medium mt-4">Rolling summary</h2>
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">
        {saga.rollingSummary ?? '(not yet generated)'}
      </pre>
      <h2 className="font-medium mt-4">Arcs</h2>
      {arcs.length === 0 ? (
        <p className="text-sm text-gray-500">No arcs planned yet. Plan arcs before generating chapters in this saga.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {arcs.map((arc) => (
            <li key={arc.id} className="border rounded p-3">
              <div className="flex justify-between">
                <Link href={`/stories/${id}/arcs/${arc.id}` as any} className="font-semibold text-blue-700">
                  {(arc.arcNumber ?? 0) + 1}. {arc.title}
                </Link>
                &nbsp;&nbsp;
                <span className="text-gray-500">Chapters {arc.startChapter}–{arc.endChapter}</span>
              </div>
              <p className="mt-1 text-gray-700">{arc.premise}</p>
            </li>
          ))}
        </ul>
      )}
      <PlanArcsButton storyId={id} sagaId={sagaId} defaultCurrentState={defaultCurrentState} />
    </div>
  );
}