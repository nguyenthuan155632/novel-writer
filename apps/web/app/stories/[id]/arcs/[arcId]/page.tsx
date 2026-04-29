import { getArc } from '@/lib/api/arcs';

export default async function ArcDetail({ params }: { params: Promise<{ id: string; arcId: string }> }) {
  const { id, arcId } = await params;
  const arc = await getArc(id, arcId);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">{arc.title}</h1>
      <p className="text-sm text-gray-500 mb-4">Chapters {arc.startChapter}–{arc.endChapter} · summary v{arc.summaryVersion}</p>
      <h2 className="font-medium mt-4">Premise</h2>
      <p className="text-sm">{arc.premise}</p>
      <h2 className="font-medium mt-4">Expected changes</h2>
      <ul className="list-disc pl-6 text-sm">{arc.expectedChanges.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <h2 className="font-medium mt-4">Seeds to resolve in arc</h2>
      <ul className="list-disc pl-6 text-sm">{arc.seedsToResolveInArc.map((k) => <li key={k}><code>{k}</code></li>)}</ul>
      <h2 className="font-medium mt-4">Rolling summary</h2>
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">{arc.rollingSummary ?? '(not generated)'}</pre>
    </div>
  );
}