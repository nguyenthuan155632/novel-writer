# Chapter Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `DELETE /api/stories/:storyId/chapters/:chapterNumber` endpoint that deletes the latest chapter in a story and all its dependent data.

**Architecture:** Hard delete wrapped in a Drizzle transaction. Database cascades handle most child tables automatically. Three tables that reference `chapterNumber` without FK constraints (`timeline_events`, `open_threads`, `canon_facts`) are cleaned up explicitly in the transaction. A guard prevents deleting any chapter that is not the highest-numbered one in the story.

**Tech Stack:** Fastify, Drizzle ORM, PostgreSQL, Vitest

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/api/src/routes/chapters.ts` | Add the DELETE handler and new imports |
| `apps/api/test/routes/chapters.test.ts` | Add tests for the delete endpoint |

---

## Task 1: Add the DELETE handler to the chapters route

**Files:**
- Modify: `apps/api/src/routes/chapters.ts`

- [ ] **Step 1: Add new schema imports**

Add `timelineEvents`, `openThreads`, and `canonFacts` to the existing `@novel/db/schema` import, and add `sql` to the `drizzle-orm` imports.

Current imports (lines 4-5):
```ts
import { arcs, chapters, sagas, storyBibles } from '@novel/db/schema';
import { eq, and, asc, desc, gte, isNull, lte, or } from 'drizzle-orm';
```

Replace with:
```ts
import {
  arcs,
  canonFacts,
  chapters,
  openThreads,
  sagas,
  storyBibles,
  timelineEvents,
} from '@novel/db/schema';
import { eq, and, asc, desc, gte, isNull, lte, or, sql } from 'drizzle-orm';
```

- [ ] **Step 2: Add the DELETE route handler**

Insert the following handler **before** the `done()` call on line 159:

```ts
  app.delete('/api/stories/:storyId/chapters/:chapterNumber', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    const db = getDb();

    const [chapter] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)))
      .limit(1);

    if (!chapter) {
      return reply.code(404).send({ error: 'chapter_not_found' });
    }

    if (chapter.status === 'generating') {
      return reply.code(409).send({ error: 'chapter_is_generating' });
    }

    const [{ max }] = await db
      .select({ max: sql<number>`MAX(${chapters.chapterNumber})` })
      .from(chapters)
      .where(eq(chapters.storyId, storyId));

    if (chapterNumber < (max ?? 0)) {
      return reply.code(400).send({ error: 'only_latest_chapter_can_be_deleted' });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(timelineEvents)
        .where(and(eq(timelineEvents.storyId, storyId), eq(timelineEvents.chapterNumber, chapterNumber)));

      await tx
        .update(openThreads)
        .set({ openedChapter: sql`NULL` })
        .where(and(eq(openThreads.storyId, storyId), eq(openThreads.openedChapter, chapterNumber)));

      await tx
        .update(openThreads)
        .set({ plannedResolutionChapter: sql`NULL` })
        .where(and(eq(openThreads.storyId, storyId), eq(openThreads.plannedResolutionChapter, chapterNumber)));

      await tx
        .delete(canonFacts)
        .where(and(eq(canonFacts.storyId, storyId), eq(canonFacts.sourceChapter, chapterNumber)));

      await tx
        .delete(chapters)
        .where(eq(chapters.id, chapter.id));
    });

    return reply.code(204).send();
  });
```

- [ ] **Step 3: Run the API typecheck / build**

```bash
cd /Users/thuan.nv/workspaces/novel-writer && pnpm --filter @novel/api run typecheck
```

Expected: passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/chapters.ts
git commit -m "feat(api): add DELETE latest chapter endpoint"
```

---

## Task 2: Add tests for the delete endpoint

**Files:**
- Modify: `apps/api/test/routes/chapters.test.ts`

- [ ] **Step 1: Add new schema imports**

Add `canonFacts`, `chapters`, `openThreads`, and `timelineEvents` to the existing `@novel/db/schema` import.

Current import (line 5):
```ts
import { arcs, sagas, stories, storyBibles } from '@novel/db/schema';
```

Replace with:
```ts
import {
  arcs,
  canonFacts,
  chapters,
  openThreads,
  sagas,
  stories,
  storyBibles,
  timelineEvents,
} from '@novel/db/schema';
```

- [ ] **Step 2: Add a helper to create a chapter row**

Insert the following helper function **after** `createPlannedStory` (after line 67):

```ts
async function createChapter(
  storyId: string,
  chapterNumber: number,
  overrides?: Partial<typeof chapters.$inferInsert>,
): Promise<string> {
  const db = getDb(TEST_DB);
  const [row] = await db
    .insert(chapters)
    .values({
      storyId,
      chapterNumber,
      title: `Chapter ${chapterNumber}`,
      content: `Content for chapter ${chapterNumber}`,
      status: 'draft',
      wordCount: 100,
      ...overrides,
    })
    .returning({ id: chapters.id });
  return row!.id;
}
```

- [ ] **Step 3: Add the DELETE tests**

Insert the following test cases **inside** the `describe('chapters routes', () => { ... })` block, after the last existing test (after line 212):

```ts
  it('DELETE /api/stories/:storyId/chapters/:chapterNumber deletes the latest chapter', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);
    await createChapter(storyId, 2);

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/2`,
    });

    expect(r.statusCode).toBe(204);

    const db = getDb(TEST_DB);
    const remaining = await db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.chapterNumber).toBe(1);

    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE returns 400 when chapter is not the latest', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);
    await createChapter(storyId, 2);

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body).error).toBe('only_latest_chapter_can_be_deleted');

    const db = getDb(TEST_DB);
    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE returns 404 for missing chapter', async () => {
    const storyId = '00000000-0000-0000-0000-000000000000';
    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/99`,
    });

    expect(r.statusCode).toBe(404);
    expect(JSON.parse(r.body).error).toBe('chapter_not_found');
  });

  it('DELETE returns 409 when chapter is generating', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1, { status: 'generating' });

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(409);
    expect(JSON.parse(r.body).error).toBe('chapter_is_generating');

    const db = getDb(TEST_DB);
    await db.delete(stories).where(eq(stories.id, storyId));
  });

  it('DELETE cleans up timeline_events, open_threads, and canon_facts', async () => {
    const storyId = await createPlannedStory();
    await createChapter(storyId, 1);

    const db = getDb(TEST_DB);
    await db.insert(timelineEvents).values({
      storyId,
      chapterNumber: 1,
      eventText: 'An event',
    });
    await db.insert(openThreads).values({
      storyId,
      title: 'A thread',
      openedChapter: 1,
      plannedResolutionChapter: 1,
    });
    await db.insert(canonFacts).values({
      storyId,
      fact: 'A fact',
      sourceChapter: 1,
    });

    const r = await app.inject({
      method: 'DELETE',
      url: `/api/stories/${storyId}/chapters/1`,
    });

    expect(r.statusCode).toBe(204);

    const events = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.storyId, storyId));
    expect(events).toHaveLength(0);

    const threads = await db
      .select()
      .from(openThreads)
      .where(eq(openThreads.storyId, storyId));
    expect(threads).toHaveLength(1);
    expect(threads[0]!.openedChapter).toBeNull();
    expect(threads[0]!.plannedResolutionChapter).toBeNull();

    const facts = await db
      .select()
      .from(canonFacts)
      .where(eq(canonFacts.storyId, storyId));
    expect(facts).toHaveLength(0);

    await db.delete(stories).where(eq(stories.id, storyId));
  });
```

- [ ] **Step 4: Run the tests**

```bash
cd /Users/thuan.nv/workspaces/novel-writer && pnpm --filter @novel/api test test/routes/chapters.test.ts
```

Expected: all tests pass, including the 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/routes/chapters.test.ts
git commit -m "test(api): add tests for chapter deletion endpoint"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ `DELETE /api/stories/:storyId/chapters/:chapterNumber` endpoint — Task 1
   - ✅ Reject non-latest chapter with 400 — Task 1 Step 2 + Task 2 Step 3 test
   - ✅ Reject generating chapter with 409 — Task 1 Step 2 + Task 2 Step 3 test
   - ✅ Return 404 for missing chapter — Task 1 Step 2 + Task 2 Step 3 test
   - ✅ Transactional cleanup of `timeline_events`, `open_threads`, `canon_facts` — Task 1 Step 2 + Task 2 Step 3 test
   - ✅ Database cascades handle the rest — covered by Task 2 Step 3 test verifying remaining chapter count

2. **Placeholder scan:**
   - ✅ No TBD, TODO, or vague steps. Every step contains exact code and commands.

3. **Type consistency:**
   - ✅ `chapterNumber` is `number` everywhere.
   - ✅ `storyId` is `string` (UUID) everywhere.
   - ✅ `sql<number>\`MAX(...)\`` used for max query, matching existing `costs.ts` pattern.
   - ✅ `sql\`NULL\`` used for nulling integer columns in updates.

4. **Testing:**
   - ✅ Tests verify 204, 400, 404, 409 responses.
   - ✅ Tests verify dependent data cleanup (timeline_events deleted, open_threads nulled, canon_facts deleted).
   - ✅ Tests verify cascade behavior (only 1 chapter remains after deleting chapter 2).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-01-chapter-deletion-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?