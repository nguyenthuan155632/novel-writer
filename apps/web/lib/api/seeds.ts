const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface PlantedSeed {
  id: string; seedKey: string; description: string;
  plantWindowStart: number; plantWindowEnd: number;
  payoffChapter: number | null;
  importance: string;
  status: string;
  plantedInChapter: number | null;
  paidOffAtChapter: number | null;
}

export async function listSeeds(storyId: string): Promise<PlantedSeed[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listSeeds ${r.status}`);
  return (await r.json()).seeds;
}

export async function patchSeed(storyId: string, seedId: string, body: Partial<PlantedSeed>) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds/${seedId}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patchSeed ${r.status}`);
  return (await r.json()).seed;
}

export async function deleteSeed(storyId: string, seedId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/seeds/${seedId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`deleteSeed ${r.status}`);
  return r.json();
}