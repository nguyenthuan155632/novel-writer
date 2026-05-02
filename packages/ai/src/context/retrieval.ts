import { eq, and, gte, lte, desc, lt, sql } from "drizzle-orm";
import {
  storyBibles,
  sagas,
  arcs,
  characters,
  openThreads,
  plantedSeeds,
  chapterSummaries,
  factions,
  timelineEvents,
  pendingCanonUpdates,
} from "@novel/db/schema";
import type { Db } from "@novel/db";
import type { CanonFact, Saga, Arc, StoryBible } from "@novel/db/schema";
import {
  compactCharacter,
  compactThread,
  compactSeed,
  compactSummary,
  compactFact,
  compactFaction,
  compactPendingCanonUpdate,
} from "./compact.js";
import type {
  CharacterCompact,
  ThreadCompact,
  SeedCompact,
  ChapterSummaryCompact,
  CanonFactCompact,
  FactionCompact,
  TimelineEventCompact,
  PendingCanonUpdateCompact,
} from "./types.js";

export async function getStoryBible(
  db: Db,
  storyId: string,
): Promise<StoryBible | null> {
  const rows = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.storyId, storyId))
    .orderBy(desc(storyBibles.version), desc(storyBibles.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSagaForChapter(
  db: Db,
  storyId: string,
  chapterNumber: number,
): Promise<Saga | null> {
  const rows = await db
    .select()
    .from(sagas)
    .where(
      and(eq(sagas.storyId, storyId), lte(sagas.startChapter, chapterNumber)),
    )
    .orderBy(desc(sagas.startChapter))
    .limit(1);
  const saga = rows[0];
  if (!saga) return null;
  if (saga.endChapter != null && saga.endChapter < chapterNumber) return null;
  return saga;
}

export async function getArcForChapter(
  db: Db,
  storyId: string,
  chapterNumber: number,
): Promise<Arc | null> {
  const rows = await db
    .select()
    .from(arcs)
    .where(
      and(eq(arcs.storyId, storyId), lte(arcs.startChapter, chapterNumber)),
    )
    .orderBy(desc(arcs.startChapter))
    .limit(1);
  const arc = rows[0];
  if (!arc) return null;
  if (arc.endChapter != null && arc.endChapter < chapterNumber) return null;
  return arc;
}

export async function getArcById(db: Db, arcId: string): Promise<Arc | null> {
  const rows = await db.select().from(arcs).where(eq(arcs.id, arcId)).limit(1);
  return rows[0] ?? null;
}

export async function getActiveCharacters(
  db: Db,
  storyId: string,
  chapterNumber: number,
): Promise<CharacterCompact[]> {
  const rows = await db
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.storyId, storyId),
        lte(characters.lastSeenChapter, chapterNumber + 10),
      ),
    )
    .orderBy(desc(characters.lastSeenChapter));
  return rows.map((c) => compactCharacter(c));
}

export async function getFactionsForStory(
  db: Db,
  storyId: string,
): Promise<FactionCompact[]> {
  const rows = await db
    .select({
      id: factions.id,
      name: factions.name,
      status: factions.status,
      type: factions.type,
      powerLevel: factions.powerLevel,
    })
    .from(factions)
    .where(eq(factions.storyId, storyId));
  return rows.map((r) => compactFaction(r));
}

export async function getOpenThreadsForStory(
  db: Db,
  storyId: string,
): Promise<ThreadCompact[]> {
  const rows = await db
    .select()
    .from(openThreads)
    .where(
      and(
        eq(openThreads.storyId, storyId),
        sql`${openThreads.status} NOT IN ('resolved')`,
      ),
    );
  return rows.map((t) => compactThread(t));
}

export async function getPlantedSeedsForStory(
  db: Db,
  storyId: string,
): Promise<SeedCompact[]> {
  const rows = await db
    .select()
    .from(plantedSeeds)
    .where(eq(plantedSeeds.storyId, storyId));
  return rows.map((s) => compactSeed(s));
}

export async function getSeedsDueForChapter(
  db: Db,
  storyId: string,
  chapterNumber: number,
): Promise<SeedCompact[]> {
  const rows = await db
    .select()
    .from(plantedSeeds)
    .where(
      and(
        eq(plantedSeeds.storyId, storyId),
        lte(plantedSeeds.plantWindowStart, chapterNumber),
        gte(plantedSeeds.plantWindowEnd, chapterNumber),
        sql`${plantedSeeds.status} NOT IN ('paid_off', 'abandoned')`,
      ),
    );
  return rows.map((s) => compactSeed(s));
}

export async function getRecentSummaries(
  db: Db,
  storyId: string,
  beforeChapter: number,
  limit: number,
): Promise<ChapterSummaryCompact[]> {
  const rows = await db
    .select({
      chapterNumber: chapterSummaries.chapterNumber,
      summary: chapterSummaries.summary,
    })
    .from(chapterSummaries)
    .where(
      and(
        eq(chapterSummaries.storyId, storyId),
        lt(chapterSummaries.chapterNumber, beforeChapter),
      ),
    )
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(limit);
  return rows.map((s) => compactSummary(s));
}

export async function getTopKCanonFacts(
  db: Db,
  storyId: string,
  embedding: number[],
  topK: number,
  minImportance: string[] = ["high", "locked"],
): Promise<CanonFactCompact[]> {
  const vectorLiteral = `[${embedding.map((n) => Number(n)).join(",")}]`;
  const results = await db.execute(sql`
    SELECT id, story_id, topic, fact, source_chapter, importance, locked, tags, embedding, created_at
    FROM canon_facts
    WHERE story_id = ${storyId}
    AND importance IN (${sql.join(
      minImportance.map((i) => sql`${i}`),
      sql`, `,
    )})
    AND embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}
    LIMIT ${topK}
  `);
  const rows = Array.from(results) as CanonFact[];
  return rows.map((f) => compactFact(f));
}

export async function getPastChapterSummaries(
  db: Db,
  storyId: string,
  currentChapter: number,
  minGap: number,
  topK: number,
): Promise<ChapterSummaryCompact[]> {
  const threshold = currentChapter - minGap;
  const rows = await db
    .select({
      chapterNumber: chapterSummaries.chapterNumber,
      summary: chapterSummaries.summary,
    })
    .from(chapterSummaries)
    .where(
      and(
        eq(chapterSummaries.storyId, storyId),
        lt(chapterSummaries.chapterNumber, threshold),
      ),
    )
    .orderBy(desc(chapterSummaries.chapterNumber))
    .limit(topK);
  return rows.map((s) => compactSummary(s));
}

export async function getTimelineEventsForChapter(
  db: Db,
  storyId: string,
  chapterNumber: number,
  limit = 20,
): Promise<TimelineEventCompact[]> {
  const rows = await db
    .select({
      chapterNumber: timelineEvents.chapterNumber,
      eventType: timelineEvents.eventType,
      eventText: timelineEvents.eventText,
      importance: timelineEvents.importance,
    })
    .from(timelineEvents)
    .where(
      and(
        eq(timelineEvents.storyId, storyId),
        lte(timelineEvents.chapterNumber, chapterNumber),
      ),
    )
    .orderBy(desc(timelineEvents.chapterNumber))
    .limit(limit);
  return rows.map((r) => ({
    chapterNumber: r.chapterNumber,
    eventType: r.eventType ?? "event",
    eventText: r.eventText,
    importance: r.importance ?? "medium",
  }));
}

export async function getPendingCanonUpdatesForStory(
  db: Db,
  storyId: string,
  limit = 10,
): Promise<PendingCanonUpdateCompact[]> {
  const rows = await db
    .select()
    .from(pendingCanonUpdates)
    .where(
      and(
        eq(pendingCanonUpdates.storyId, storyId),
        eq(pendingCanonUpdates.resolution, "pending"),
      ),
    )
    .orderBy(desc(pendingCanonUpdates.createdAt))
    .limit(limit);
  return rows.map((r) => compactPendingCanonUpdate(r));
}

export type RetrievalResult = {
  bible: StoryBible | null;
  saga: Saga | null;
  arc: Arc | null;
  characters: CharacterCompact[];
  threads: ThreadCompact[];
  allSeeds: SeedCompact[];
  dueSeeds: SeedCompact[];
  recentSummaries: ChapterSummaryCompact[];
  pastChapterSummaries: ChapterSummaryCompact[];
  canonFacts: CanonFactCompact[];
};
