import { estimateTokensJson } from '@novel/core/utils/tokens';
import { CONTEXT_CONFIG } from '@novel/core';
import type {
  ChapterContext,
  CharacterCompact,
  CanonFactCompact,
  ChapterSummaryCompact,
  PendingCanonUpdateCompact,
  TimelineEventCompact,
} from './types.js';

type ShrinkAction = typeof CONTEXT_CONFIG.SHRINK_ORDER[number];

const MIN_KEEP = 3;
const RAISED_FACT_IMPORTANCE: ReadonlySet<string> = new Set(['locked']);
const RECENT_SUMMARY_MIN_GAP = CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_MIN_GAP + 5;

export function shrinkToFit(ctx: ChapterContext, targetBudget: number): ChapterContext {
  let current = structuredClone(ctx);

  for (const action of CONTEXT_CONFIG.SHRINK_ORDER) {
    if (estimateTokensJson(current) <= targetBudget) break;
    current = applyShrink(current, action, targetBudget);
  }

  return current;
}

function applyShrink(
  ctx: ChapterContext,
  action: ShrinkAction,
  targetBudget: number,
): ChapterContext {
  const next = structuredClone(ctx);

  switch (action) {
    case 'retrievedPastChapters':
      next.cold.retrievedPastChapters = [];
      break;
    case 'retrievedFacts':
      next.cold.retrievedFacts = raiseFactThreshold(next.cold.retrievedFacts);
      if (estimateTokensJson(next) > targetBudget) {
        next.cold.pendingCanonUpdates = dropOldestPendingCanonUpdates(
          next.cold.pendingCanonUpdates,
        );
      }
      if (estimateTokensJson(next) > targetBudget) {
        next.cold.timelineEvents = dropOldestTimelineEvents(next.cold.timelineEvents);
      }
      break;
    case 'recentSummaries':
      next.cold.recentSummaries = increaseRecentSummaryGap(
        next.cold.recentSummaries,
      );
      break;
    case 'activeCharactersCompactMode':
      next.warm.activeCharacters = trimActiveCharacters(
        next.warm.activeCharacters,
      ).map(stripCharacter) as CharacterCompact[];
      break;
  }

  return next;
}

function trimActiveCharacters(characters: CharacterCompact[]): CharacterCompact[] {
  if (characters.length <= MIN_KEEP) return characters;

  return [...characters]
    .sort((a, b) => getLastActiveChapter(b) - getLastActiveChapter(a))
    .slice(0, MIN_KEEP);
}

function getLastActiveChapter(character: CharacterCompact): number {
  const realmMatch = character.currentRealm?.match(/(\d+)$/);
  if (realmMatch) return Number(realmMatch[1]);
  const idMatch = character.id.match(/(\d+)$/);
  return idMatch ? Number(idMatch[1]) : 0;
}

function raiseFactThreshold(facts: CanonFactCompact[]): CanonFactCompact[] {
  return facts.filter((fact) => RAISED_FACT_IMPORTANCE.has(fact.importance));
}

function increaseRecentSummaryGap(
  summaries: ChapterSummaryCompact[],
): ChapterSummaryCompact[] {
  if (summaries.length <= 1) return summaries;

  const kept: ChapterSummaryCompact[] = [summaries[0]!];
  for (const summary of summaries.slice(1)) {
    const lastKept = kept[kept.length - 1]!;
    if (Math.abs(lastKept.chapterNumber - summary.chapterNumber) >= RECENT_SUMMARY_MIN_GAP) {
      kept.push(summary);
    }
  }
  return kept;
}

function dropOldestPendingCanonUpdates(
  updates: PendingCanonUpdateCompact[],
): PendingCanonUpdateCompact[] {
  if (updates.length <= 1) return [];
  return updates.slice(0, -1);
}

function dropOldestTimelineEvents(
  events: TimelineEventCompact[],
): TimelineEventCompact[] {
  if (events.length <= 1) return [];
  return events.slice(0, -1);
}

function stripCharacter(c: CharacterCompact): CharacterCompact {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    bloodlines: [],
    shortTraits: [],
  };
}
