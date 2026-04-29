const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface CostSummary {
  usage: { dailyUsd: number; monthlyUsd: number };
  caps: { PER_CHAPTER_HARD_CAP_USD: number; PER_STORY_DAILY_CAP_USD: number; PER_STORY_MONTHLY_CAP_USD: number; ALERT_THRESHOLD_PERCENT: number };
}
export interface AgentRow { agent: string; callCount: number; tokens: number; cost: string; }
export interface ChapterRow { chapterNumber: number; cost: string; tokens: number; }

export async function getSummary(storyId: string): Promise<CostSummary> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/summary`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`summary ${r.status}`);
  return r.json();
}

export async function getByAgent(storyId: string): Promise<AgentRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/by-agent`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`by-agent ${r.status}`);
  return (await r.json()).rows;
}

export async function getByChapter(storyId: string): Promise<ChapterRow[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/costs/by-chapter`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`by-chapter ${r.status}`);
  return (await r.json()).rows;
}