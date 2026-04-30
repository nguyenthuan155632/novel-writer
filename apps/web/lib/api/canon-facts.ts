const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
export interface CanonFact {
  id: string; subjectType: string; subjectKey: string;
  fact: string; importance: string;
  locked: boolean;
  firstSeenChapter: number | null; lastConfirmedChapter: number | null;
}

export async function listCanonFacts(storyId: string): Promise<CanonFact[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/canon-facts`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listCanonFacts ${r.status}`);
  return (await r.json()).facts;
}

export async function setLocked(storyId: string, factId: string, locked: boolean) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/canon-facts/${factId}/lock`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locked }),
  });
  if (!r.ok) throw new Error(`setLocked ${r.status}`);
  return r.json();
}

export async function deleteCanonFact(storyId: string, factId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/canon-facts/${factId}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error(`deleteCanonFact ${r.status}`);
  return r.json();
}