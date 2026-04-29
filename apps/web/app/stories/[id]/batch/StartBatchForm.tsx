'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startBatch } from '@/lib/api/batches';

export function StartBatchForm({ storyId }: { storyId: string }) {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(10);
  const [mode, setMode] = useState<'safe' | 'semi_auto' | 'full_auto'>('semi_auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const projectedCost = (end - start + 1) * 0.007;
  return (
    <form className="border rounded p-4 space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!confirm(`Generate chapters ${start}–${end} in ${mode} mode? Estimated cost ~$${projectedCost.toFixed(2)}.`)) return;
      setBusy(true); setError(null);
      try { await startBatch(storyId, { startChapter: start, endChapter: end, mode }); router.refresh(); }
      catch (e: any) { setError(e.message); }
      finally { setBusy(false); }
    }}>
      <div className="flex gap-2 items-center">
        <label>From <input type="number" min={1} value={start} onChange={(e) => setStart(Number(e.target.value))} className="border rounded w-20 p-1" /></label>
        <label>To <input type="number" min={start} value={end} onChange={(e) => setEnd(Number(e.target.value))} className="border rounded w-20 p-1" /></label>
        <label>Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border rounded p-1 ml-1">
            <option value="safe">safe</option>
            <option value="semi_auto">semi_auto</option>
            <option value="full_auto">full_auto</option>
          </select>
        </label>
      </div>
      <div className="text-sm text-gray-500">Estimated cost: ${projectedCost.toFixed(2)} (at ~$0.007/chapter)</div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {busy ? 'Starting…' : 'Start batch'}
      </button>
    </form>
  );
}