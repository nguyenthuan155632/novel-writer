const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
export interface TimelineRow { number: number; title: string | null; shortSummary: string | null; completedAt: string | null; }

export async function getTimeline(storyId: string): Promise<TimelineRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/timeline`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getTimeline ${r.status}`);
  return (await r.json()).timeline;
}