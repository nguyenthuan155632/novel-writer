import { mergeOverrides, type EffectiveConfig } from '@novel/core';
import { getDb } from '@novel/db';
import { storySettings } from '@novel/db/schema';
import { eq } from 'drizzle-orm';

export async function loadEffectiveStoryConfig(storyId: string): Promise<EffectiveConfig> {
  const db = getDb();
  const [row] = await db.select({ overrides: storySettings.overrides })
    .from(storySettings)
    .where(eq(storySettings.storyId, storyId));
  return mergeOverrides((row?.overrides ?? {}) as Parameters<typeof mergeOverrides>[0]);
}
