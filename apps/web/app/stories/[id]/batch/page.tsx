import { listBatches } from '@/lib/api/batches';
import { StartBatchForm } from './StartBatchForm';

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batches = await listBatches(id);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Batch generation</h1>
      <StartBatchForm storyId={id} />
      <h2 className="font-medium mt-8 mb-2">History</h2>
      <ul className="space-y-2 text-sm">
        {batches.map((b) => (
          <li key={b.id} className="border rounded p-3">
            <div className="flex justify-between">
              <span>ch {b.startChapter}–{b.endChapter} · mode={b.mode}</span>
              <span>{b.status} ({b.completedChapters} done · ${Number(b.totalCostUsd).toFixed(4)})</span>
            </div>
            {b.pausedReason && <div className="text-xs text-amber-700 mt-1">paused: {b.pausedReason}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}