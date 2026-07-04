import { CONTEXT_CONFIG, type ContextConfig } from '@novel/core';
import { estimateTokensJson } from '@novel/core/utils/tokens';
import type {
  ChapterContext,
  CharacterCompact,
  CanonFactCompact,
  ChapterSummaryCompact,
  PendingCanonUpdateCompact,
  TimelineEventCompact,
  ColdTier,
} from './types.js';

type ShrinkAction = ContextConfig['SHRINK_ORDER'][number];

type ShrinkOptions = {
  order?: readonly ShrinkAction[];
  retrievedPastChaptersMinGap?: number;
};

const DEFAULT_ORDER: readonly ShrinkAction[] = [
  'activeCharactersCompactMode',
  'retrievedFacts',
  'recentSummaries',
];
const MIN_KEEP = 3;
const RAISED_FACT_IMPORTANCE: ReadonlySet<string> = new Set(['locked']);
const RECENT_SUMMARY_MIN_GAP = 10;

function countItems(ctx: ChapterContext): Record<string, number> {
  return {
    retrievedFacts: ctx.cold.retrievedFacts.length,
    recentSummaries: ctx.cold.recentSummaries.length,
    retrievedPastChapters: ctx.cold.retrievedPastChapters.length,
    activeCharacters: ctx.warm.activeCharacters.length,
    pendingCanonUpdates: ctx.cold.pendingCanonUpdates.length,
    timelineEvents: ctx.cold.timelineEvents.length,
  };
}

export function shrinkToFit(
  ctx: ChapterContext,
  targetBudget: number,
  options: ShrinkOptions = {},
): ChapterContext {
  let current = structuredClone(ctx);
  const order = options.order ?? DEFAULT_ORDER;

  if (estimateTokensJson(current) <= targetBudget) return current;

  const before = countItems(current);
  const actionsApplied: string[] = [];

  for (const action of order) {
    if (estimateTokensJson(current) <= targetBudget) break;
    current = applyShrink(current, action, options);
    actionsApplied.push(action);
  }

  if (estimateTokensJson(current) > targetBudget) {
    current.cold.pendingCanonUpdates = dropOldestPendingCanonUpdates(current.cold.pendingCanonUpdates);
    actionsApplied.push('pendingCanonUpdates');
  }
  if (estimateTokensJson(current) > targetBudget) {
    current.cold.timelineEvents = dropOldestTimelineEvents(current.cold.timelineEvents);
    actionsApplied.push('timelineEvents');
  }

  const after = countItems(current);
  const dropped: Record<string, number> = {};
  for (const key of Object.keys(before)) {
    const delta = (before[key] ?? 0) - (after[key] ?? 0);
    if (delta > 0) dropped[key] = delta;
  }
  current.meta.shrinkReport = { actionsApplied, dropped };
  return current;
}

function applyShrink(
  ctx: ChapterContext,
  action: ShrinkAction,
  options: ShrinkOptions,
): ChapterContext {
  const next = structuredClone(ctx);

  switch (action) {
    case 'activeCharactersCompactMode':
      next.warm.activeCharacters = trimActiveCharacters(next.warm.activeCharacters).map(stripCharacter);
      return next;
    case 'retrievedFacts':
      next.cold.retrievedFacts = raiseFactThreshold(next.cold.retrievedFacts);
      return next;
    case 'recentSummaries':
      next.cold.recentSummaries = increaseRecentSummaryGap(next.cold.recentSummaries);
      return next;
    case 'retrievedPastChapters':
      next.cold.retrievedPastChapters = tightenRetrievedPastChapters(
        next.cold,
        next.meta.chapterNumber,
        options.retrievedPastChaptersMinGap ??
          CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_MIN_GAP,
      );
      return next;
  }
}

function trimActiveCharacters(characters: CharacterCompact[]): CharacterCompact[] {
  if (characters.length <= MIN_KEEP) return characters;

  return [...characters]
    .sort((a, b) => (b.lastActiveChapter ?? 0) - (a.lastActiveChapter ?? 0))
    .slice(0, MIN_KEEP);
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

function tightenRetrievedPastChapters(
  cold: ColdTier,
  chapterNumber: number,
  baseMinGap: number,
): ChapterSummaryCompact[] {
  if (cold.retrievedPastChapters.length === 0) return [];

  const raisedMinGap = Math.max(baseMinGap + 5, baseMinGap * 2);
  const threshold = chapterNumber - raisedMinGap;
  return cold.retrievedPastChapters.filter(
    (summary) => summary.chapterNumber < threshold,
  );
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
    lastActiveChapter: c.lastActiveChapter,
  };
}
