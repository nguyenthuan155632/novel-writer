const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface StorySettings {
  overrides: Record<string, unknown>;
}

export async function getStorySettings(storyId: string): Promise<StorySettings> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/settings`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`getStorySettings ${r.status}`);
  return r.json();
}

export async function putStorySettings(storyId: string, overrides: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${BASE}/api/stories/${storyId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`putStorySettings ${r.status}: ${text}`);
  }
}