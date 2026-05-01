import { eq } from 'drizzle-orm';
import type { Db } from '@novel/db';
import { stories, storySettings } from '@novel/db/schema';
import {
  findGenre, findPersonality, StoryOptionsSchema,
  type GenreDef, type PersonalityDef, type StoryOptions, type GenreFamily,
} from '@novel/core';

export type StoryDomainContext = {
  storyId: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
  genreFamily: GenreFamily;
};

export async function loadStoryDomainContext(
  db: Db, storyId: string,
): Promise<StoryDomainContext> {
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) throw new Error(`story not found: ${storyId}`);

  const genreDef = findGenre(story.genre);
  const personalityDef = findPersonality(story.mainCharacterPersonality);

  const [settings] = await db.select().from(storySettings)
    .where(eq(storySettings.storyId, storyId));
  const rawOpts = (settings?.overrides as Record<string, unknown> | undefined)
    ?.storyOptions ?? {};
  const storyOptions = StoryOptionsSchema.parse(rawOpts);

  return {
    storyId,
    genreDef,
    personalityDef,
    storyOptions,
    genreFamily: genreDef.family,
  };
}
