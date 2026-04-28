import { describe, it, expect, afterAll } from 'vitest';
import { getDb, getSqlClient } from '../src/client.ts';
import { stories, storyBibles } from '../src/schema/index.ts';
import { eq } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';

describe('schema smoke', () => {
  const db = getDb(TEST_DB_URL);

  it('can insert and query a story', async () => {
    const [inserted] = await db.insert(stories).values({
      title: 'Test Story',
      premise: 'A test premise',
    }).returning();
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);

    const found = await db.select().from(stories).where(eq(stories.id, inserted.id));
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Test Story');

    await db.delete(stories).where(eq(stories.id, inserted.id));
  });

  it('cascade-deletes story bible when story removed', async () => {
    const [story] = await db.insert(stories).values({ title: 'X', premise: 'Y' }).returning();
    await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: 'r',
      cultivationSystem: 'c',
      bloodlineSystem: 'b',
      styleGuide: 's',
      forbiddenRules: 'f',
    });
    await db.delete(stories).where(eq(stories.id, story.id));
    const remaining = await db.select().from(storyBibles).where(eq(storyBibles.storyId, story.id));
    expect(remaining).toHaveLength(0);
  });

  afterAll(async () => {
    await getSqlClient(TEST_DB_URL).end();
  });
});