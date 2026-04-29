const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface HighStakesReview {
  id: string; chapterId: string;
  triggerReason: string;
  approve: string;
  concerns: { category: string; severity: string; description: string; quote?: string }[];
  recommendedActions: { action: string; rationale: string }[];
  costUsd: string;
  createdAt: string;
}

export async function listReviews(storyId: string): Promise<HighStakesReview[]> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/reviews`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`listReviews ${r.status}`);
  return (await r.json()).reviews;
}

export async function triggerReview(storyId: string, chapterId: string) {
  const r = await fetch(`${BASE}/api/stories/${storyId}/reviews/trigger`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chapterId }),
  });
  if (!r.ok) throw new Error(`triggerReview ${r.status}`);
  return r.json();
}