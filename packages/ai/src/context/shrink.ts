import { estimateTokensJson } from '@novel/core/utils/tokens';
import { CONTEXT_CONFIG } from '@novel/core';
import type { ChapterContext, CharacterCompact } from './types.js';

type ShrinkAction = typeof CONTEXT_CONFIG.SHRINK_ORDER[number];

export function shrinkToFit(ctx: ChapterContext, targetBudget: number): ChapterContext {
  let current = structuredClone(ctx);

  for (const action of CONTEXT_CONFIG.SHRINK_ORDER) {
    if (estimateTokensJson(current) <= targetBudget) break;
    current = applyShrink(current, action);
  }

  return current;
}

function applyShrink(ctx: ChapterContext, action: ShrinkAction): ChapterContext {
  const next = structuredClone(ctx);
  switch (action) {
    case 'retrievedPastChapters':
      next.cold.retrievedPastChapters = [];
      break;
    case 'retrievedFacts':
      next.cold.retrievedFacts = [];
      break;
    case 'recentSummaries':
      next.cold.recentSummaries = next.cold.recentSummaries.slice(0, 2);
      break;
    case 'activeCharactersCompactMode': {
      next.warm.activeCharacters = next.warm.activeCharacters.map(stripCharacter) as CharacterCompact[];
      break;
    }
  }
  return next;
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