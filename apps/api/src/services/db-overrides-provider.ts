import { getDb } from '@novel/db';
import { storySettings } from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import type { StoryOverridesProvider, ConfigOverrides } from '@novel/core';

/**
 * Concrete StoryOverridesProvider that loads per-story config overrides
 * from the story_settings.overrides JSONB column.
 *
 * Lives in apps/api (not packages/core) to avoid a circular dependency:
 * packages/db depends on packages/core, so core cannot import from db.
 */
export class DbStoryOverridesProvider implements StoryOverridesProvider {
  async load(storyId: string): Promise<ConfigOverrides> {
    const db = getDb();
    const [row] = await db
      .select({ overrides: storySettings.overrides })
      .from(storySettings)
      .where(eq(storySettings.storyId, storyId));

    if (!row) return {};

    // The JSONB overrides column is typed as Record<string, unknown>.
    // Cast it to ConfigOverrides — consumers of getEffectiveConfig own
    // the schema so unknown keys are silently ignored by deepMerge.
    return (row.overrides ?? {}) as ConfigOverrides;
  }
}

/** Singleton factory — creates a new provider instance (stateless, safe to reuse). */
export function createDbOverridesProvider(): StoryOverridesProvider {
  return new DbStoryOverridesProvider();
}
