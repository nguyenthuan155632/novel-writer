const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface Batch {
  id: string; storyId: string; startChapter: number; endChapter: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  status: 'running' | 'completed' | 'paused' | 'failed' | 'cancelled';
  pausedReason: string | null;
  completedChapters: number; totalCostUsd: string;
  startedAt: string; finishedAt: string | null;
}

export async function listBatches(storyId: string): Promise<Batch[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listBatches ${r.status}`);
  return (await r.json()).batches;
}

export async function startBatch(storyId: string, body: { startChapter: number; endChapter: number; mode: 'safe' | 'semi_auto' | 'full_auto' }) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`startBatch ${r.status}`);
  return r.json();
}

export async function cancelBatch(storyId: string, batchId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/batches/${batchId}/cancel`, { method: 'POST' });
  if (!r.ok) throw new Error(`cancelBatch ${r.status}`);
  return r.json();
}