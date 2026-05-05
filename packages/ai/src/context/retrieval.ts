import { eq, and, gte, lte, desc, lt, sql } from "drizzle-orm";
import {
  chapters,
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
  stories,
  canonFacts,
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
  ParallelThreadCompact,
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

export async function getStoryTargetChapterCount(
  db: Db,
  storyId: string,
): Promise<number | null> {
  const rows = await db
    .select({ targetChapterCount: stories.targetChapterCount })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  return rows[0]?.targetChapterCount ?? null;
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
        sql`${characters.lastActiveChapter} >= ${chapterNumber - 5} OR ${characters.lastSeenChapter} >= ${chapterNumber - 5}`,
      ),
    )
    .orderBy(desc(characters.lastActiveChapter));
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
  chapterNumber: number,
  povId: string,
  activeLocationKey: string | null = null,
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
    AND (valid_until_chapter IS NULL OR ${chapterNumber} <= valid_until_chapter)
    AND (
      visibility = 'public'
      OR (visibility = 'restricted' AND known_by @> jsonb_build_array(${povId}::text))
    )
    AND (${activeLocationKey}::text IS NULL OR tags @> jsonb_build_array(${activeLocationKey}::text))
    ORDER BY embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}
    LIMIT ${topK}
  `);
  const rows = Array.from(results) as CanonFact[];
  return rows.map((f) => compactFact(f));
}

/**
 * Hybrid keyword + vector + location-boost retrieval with TTL and visibility filters.
 *
 * Falls back to pure-vector when:
 * - characterNames.length === 0 AND activeLocationKey is null, OR
 * - hybrid yields < 3 rows.
 *
 * Uses three separate parameterized queries merged in JS to avoid sql.raw injection.
 */
export async function getTopKCanonFactsHybrid(
  db: Db,
  storyId: string,
  queryEmbedding: number[],
  characterNames: string[],
  chapterNumber: number,
  povId: string | null,
  activeLocationKey: string | null,
  topK: number,
): Promise<CanonFactCompact[]> {
  const vectorResults = await getTopKCanonFacts(
    db,
    storyId,
    queryEmbedding,
    topK,
    ["high", "locked"],
    chapterNumber,
    povId ?? "",
    activeLocationKey,
  );

  if (characterNames.length === 0 && activeLocationKey === null) {
    return vectorResults;
  }

  const scoreMap = new Map<string, number>();
  const factMap = new Map<string, CanonFactCompact>();

  for (const fact of vectorResults) {
    scoreMap.set(fact.id, 0.5);
    factMap.set(fact.id, fact);
  }

  if (characterNames.length > 0) {
    const namePatterns = characterNames.map((n) => `%${n}%`);
    const visibilityFilter = povId
      ? sql`(visibility = 'public' OR (visibility = 'restricted' AND known_by @> jsonb_build_array(${povId}::text)))`
      : sql`visibility = 'public'`;

    const kwResults = await db.execute(sql`
      SELECT id, story_id, topic, fact, source_chapter, importance, locked, tags, embedding, created_at
      FROM canon_facts
      WHERE story_id = ${storyId}
        AND topic ILIKE ANY(ARRAY[${sql.join(namePatterns.map((p) => sql`${p}`), sql`, `)}])
        AND (valid_until_chapter IS NULL OR ${chapterNumber} <= valid_until_chapter)
        AND ${visibilityFilter}
      LIMIT ${topK}
    `);

    for (const fact of Array.from(kwResults) as CanonFact[]) {
      scoreMap.set(fact.id, (scoreMap.get(fact.id) ?? 0) + 0.5);
      factMap.set(fact.id, compactFact(fact));
    }
  }

  if (activeLocationKey !== null) {
    const visibilityFilter = povId
      ? sql`(visibility = 'public' OR (visibility = 'restricted' AND known_by @> jsonb_build_array(${povId}::text)))`
      : sql`visibility = 'public'`;

    const locResults = await db.execute(sql`
      SELECT id, story_id, topic, fact, source_chapter, importance, locked, tags, embedding, created_at
      FROM canon_facts
      WHERE story_id = ${storyId}
        AND (valid_until_chapter IS NULL OR ${chapterNumber} <= valid_until_chapter)
        AND ${visibilityFilter}
        AND tags @> jsonb_build_array(${activeLocationKey}::text)
      LIMIT ${topK}
    `);

    for (const fact of Array.from(locResults) as CanonFact[]) {
      scoreMap.set(fact.id, (scoreMap.get(fact.id) ?? 0) + 0.2);
      factMap.set(fact.id, compactFact(fact));
    }
  }

  const ranked = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id]) => factMap.get(id))
    .filter((fact): fact is CanonFactCompact => fact !== undefined);

  if (ranked.length < 3) {
    return vectorResults;
  }

  return ranked;
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
  const saga = await getSagaForChapter(db, storyId, chapterNumber);
  const parallelThreads = normalizeParallelThreads(saga?.parallelThreads);
  const activeThreadIds = parallelThreads
    .filter((thread) => thread.startChapter <= chapterNumber && thread.endChapter >= chapterNumber)
    .map((thread) => thread.id);
  const convergenceThreadIds = new Set(
    normalizeConvergenceThreadIds(saga?.convergencePoints, chapterNumber),
  );
  const threadIdsToInclude = Array.from(
    new Set([...activeThreadIds, ...convergenceThreadIds]),
  );

  const rows = await db
    .select({
      chapterNumber: timelineEvents.chapterNumber,
      eventType: timelineEvents.eventType,
      eventText: timelineEvents.eventText,
      importance: timelineEvents.importance,
      threadId: timelineEvents.threadId,
      relatedThreadIds: timelineEvents.relatedThreadIds,
    })
    .from(timelineEvents)
    .where(
      and(
        eq(timelineEvents.storyId, storyId),
        lte(timelineEvents.chapterNumber, chapterNumber),
      ),
    )
    .orderBy(desc(timelineEvents.chapterNumber))
    .limit(limit * 3);

  const filtered = rows.filter((row) => {
    if (!row.threadId && (!row.relatedThreadIds || row.relatedThreadIds.length === 0)) {
      return true;
    }
    if (row.threadId && threadIdsToInclude.includes(row.threadId)) {
      return true;
    }
    return (row.relatedThreadIds ?? []).some((id) => threadIdsToInclude.includes(id));
  });

  return filtered.slice(0, limit).map((r) => ({
    chapterNumber: r.chapterNumber,
    eventType: r.eventType ?? "event",
    eventText: r.eventText,
    importance: r.importance ?? "medium",
    threadId: r.threadId,
    relatedThreadIds: r.relatedThreadIds ?? [],
  }));
}

function normalizeParallelThreads(value: unknown): ParallelThreadCompact[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ParallelThreadCompact => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.id === "string"
        && typeof candidate.premise === "string"
        && typeof candidate.startChapter === "number"
        && typeof candidate.endChapter === "number"
        && (typeof candidate.parentTimelineId === "string" || candidate.parentTimelineId === null);
    })
    .map((item) => ({
      id: item.id,
      premise: item.premise,
      startChapter: item.startChapter,
      endChapter: item.endChapter,
      parentTimelineId: item.parentTimelineId,
    }));
}

function normalizeConvergenceThreadIds(value: unknown, chapterNumber: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (candidate.atChapter !== chapterNumber) return [];
    if (!Array.isArray(candidate.threadIds)) return [];
    return candidate.threadIds.filter((id): id is string => typeof id === "string");
  });
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

export type LockedCanonFactCandidate = {
  id: string;
  fact: string;
  topic: string;
  lockedFields?: string[];
};

/**
 * §1.5 — Retrieve locked canon facts that are textually relevant to the packet text.
 * Returns candidates only (no cosine hard-blocks). Caller passes to auditPacket for hint-only checks.
 */
export async function getLockedCanonFactCandidates(
  db: Db,
  storyId: string,
  packetText: string,
  topK = 10,
): Promise<LockedCanonFactCandidate[]> {
  const rows = await db
    .select({
      id: canonFacts.id,
      topic: canonFacts.topic,
      fact: canonFacts.fact,
      tags: canonFacts.tags,
    })
    .from(canonFacts)
    .where(
      and(
        eq(canonFacts.storyId, storyId),
        eq(canonFacts.locked, true),
      ),
    )
    .limit(topK * 3); // over-fetch, then filter textually

  const packetLower = packetText.toLowerCase();
  const candidates: LockedCanonFactCandidate[] = [];
  for (const row of rows) {
    const topicLower = (row.topic ?? "").toLowerCase();
    if (topicLower.length < 2) continue;
    if (packetLower.includes(topicLower)) {
      candidates.push({
        id: row.id,
        fact: row.fact,
        topic: row.topic ?? "",
        lockedFields: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      });
      if (candidates.length >= topK) break;
    }
  }
  return candidates;
}

/**
 * BACKLOG §1.6: open_thread_high_priority_overdue audit deferred.
 * Requires open_threads.priority + lastReferencedChapter schema columns before deterministic check possible.
 * Add to plan backlog once those columns land in DB migration.
 */

/**
 * §1.9 — Seeds approaching their plant deadline (within 2 chapters of plantWindowEnd).
 */
export async function getSeedsApproachingPlantDeadline(
  db: Db,
  storyId: string,
  chapterNumber: number,
  lookahead = 2,
): Promise<{ id: string; seedText: string; plantWindowEnd: number }[]> {
  const rows = await db
    .select({
      id: plantedSeeds.id,
      seedText: plantedSeeds.seedText,
      plantWindowEnd: plantedSeeds.plantWindowEnd,
    })
    .from(plantedSeeds)
    .where(
      and(
        eq(plantedSeeds.storyId, storyId),
        lte(plantedSeeds.plantWindowEnd, chapterNumber + lookahead),
        gte(plantedSeeds.plantWindowEnd, chapterNumber),
        sql`${plantedSeeds.status} NOT IN ('paid_off', 'abandoned')`,
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    seedText: r.seedText,
    plantWindowEnd: r.plantWindowEnd,
  }));
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

export async function getPrevChapterTailContent(
  db: Db,
  storyId: string,
  chapterNumber: number,
): Promise<string | null> {
  const rows = await db
    .select({ tailContent: chapters.tailContent })
    .from(chapters)
    .where(
      and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber - 1)
      )
    )
    .limit(1);
  return rows[0]?.tailContent ?? null;
}
