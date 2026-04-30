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
    <form className="studio-panel form-grid" onSubmit={async (e) => {
      e.preventDefault();
      if (!confirm(`Generate chapters ${start}–${end} in ${mode} mode? Estimated cost ~$${projectedCost.toFixed(2)}.`)) return;
      setBusy(true); setError(null);
      try { await startBatch(storyId, { startChapter: start, endChapter: end, mode }); router.refresh(); }
      catch (e: any) { setError(e.message); }
      finally { setBusy(false); }
    }}>
      <div className="studio-columns">
        <div className="field-group">
          <label>From</label>
          <input type="number" min={1} value={start} onChange={(e) => setStart(Number(e.target.value))} />
        </div>
        <div className="field-group">
          <label>To</label>
          <input type="number" min={start} value={end} onChange={(e) => setEnd(Number(e.target.value))} />
        </div>
      </div>
      <div className="field-group">
        <label>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="safe">safe</option>
            <option value="semi_auto">semi_auto</option>
            <option value="full_auto">full_auto</option>
          </select>
      </div>
      <div className="muted">Estimated cost: ${projectedCost.toFixed(2)} (at ~$0.007/chapter)</div>
      {error && <div className="error">{error}</div>}
      <button disabled={busy} className="primary">
        {busy ? 'Starting…' : 'Start batch'}
      </button>
    </form>
  );
}
