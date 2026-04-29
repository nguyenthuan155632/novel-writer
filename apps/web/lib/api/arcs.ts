const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface Arc {
  id: string; sagaId: string | null; arcNumber: number | null; title: string; premise: string | null;
  startChapter: number | null; endChapter: number | null;
  expectedChanges: string[]; seedsToResolveInArc: string[];
  summaryVersion: number; rollingSummary: string | null;
}

export async function listArcs(storyId: string, sagaId: string): Promise<Arc[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}/arcs`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listArcs ${r.status}`);
  return (await r.json()).arcs;
}

export async function getArc(storyId: string, arcId: string): Promise<Arc> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/arcs/${arcId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getArc ${r.status}`);
  return (await r.json()).arc;
}

export async function planArcs(storyId: string, sagaId: string, currentState: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/sagas/${sagaId}/arcs/plan`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentState }),
  });
  if (!r.ok) throw new Error(`planArcs ${r.status}`);
  return r.json();
}