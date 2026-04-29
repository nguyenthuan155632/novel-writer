import { apiFetch } from '@/lib/api-client';

export interface PendingCanonUpdate {
  id: string;
  storyId: string;
  chapterId: string;
  updateType: string;
  targetTable: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  conflictStatus: string;
  conflictReasons: string[];
  resolution: string;
  reviewedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export async function fetchPendingUpdates(
  storyId: string,
  resolution: string = 'pending',
): Promise<PendingCanonUpdate[]> {
  const data = await apiFetch<{ pendingUpdates: PendingCanonUpdate[] }>(
    `/api/stories/${storyId}/pending-updates?resolution=${resolution}`,
  );
  return data.pendingUpdates;
}

export async function approvePendingUpdate(
  storyId: string,
  updateId: string,
  resolution: 'approved' | 'edited' = 'approved',
): Promise<PendingCanonUpdate> {
  const data = await apiFetch<{ pendingUpdate: PendingCanonUpdate }>(
    `/api/stories/${storyId}/pending-updates/${updateId}/approve`,
    { method: 'POST', body: JSON.stringify({ resolution }) },
  );
  return data.pendingUpdate;
}

export async function rejectPendingUpdate(
  storyId: string,
  updateId: string,
  reason: string,
): Promise<PendingCanonUpdate> {
  const data = await apiFetch<{ pendingUpdate: PendingCanonUpdate }>(
    `/api/stories/${storyId}/pending-updates/${updateId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
  return data.pendingUpdate;
}