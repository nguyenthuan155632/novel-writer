import { getSaga } from '@/lib/api/sagas';

export default async function SagaDetail({ params }: { params: Promise<{ id: string; sagaId: string }> }) {
  const { id, sagaId } = await params;
  const saga = await getSaga(id, sagaId);
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
    </div>
  );
}