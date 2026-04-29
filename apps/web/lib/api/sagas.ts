const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface Saga {
  id: string; sagaNumber: number; title: string; premise: string | null;
  startChapter: number | null; endChapter: number | null;
  expectedTurningPoints: string[]; summaryVersion: number;
  rollingSummary: string | null;
}

export async function listSagas(storyId: string): Promise<Saga[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listSagas ${r.status}`);
  return (await r.json()).sagas;
}

export async function getSaga(storyId: string, sagaId: string): Promise<Saga> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getSaga ${r.status}`);
  return (await r.json()).saga;
}

export async function planSagas(storyId: string, opts: { resetSeeds?: boolean } = {}) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/plan`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!r.ok) throw new Error(`planSagas ${r.status}`);
  return r.json();
}