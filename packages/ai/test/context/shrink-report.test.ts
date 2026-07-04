import { describe, it, expect } from 'vitest';
import { shrinkToFit } from '../../src/context/shrink.js';
import type { ChapterContext } from '../../src/context/types.js';

function bigContext(): ChapterContext {
  const fact = (i: number) => ({ id: `f${i}`, topic: `t${i}`, importance: 'high', fact: 'x'.repeat(400) });
  return {
    hot: {
      systemRules: '',
      bibleCompact: '',
      styleGuide: '',
      powerSystem: '',
      powerSystemKind: 'none',
      styleFewShots: [],
      genreContract: '',
      personalityContract: '',
      storyOptionsBlock: '',
    },
    warm: {
      sagaSummary: '',
      arcSummary: '',
      activeCharacters: [],
      arcOpenThreads: [],
      arcPlantedSeeds: [],
      parallelThreads: [],
      knownFactions: [],
      entryState: undefined,
    },
    cold: {
      recentSummaries: [],
      retrievedFacts: Array.from({ length: 20 }, (_, i) => fact(i)),
      retrievedPastChapters: [],
      seedsToPlantNow: [],
      timelineEvents: [],
      pendingCanonUpdates: [],
      packet: {
        chapterNumber: 1,
        goal: '',
        conflict: '',
        cliffhanger: '',
        requiredEvents: [],
        charactersPresent: [],
        forbiddenMoves: [],
        seedsAutoEnforced: [],
      } as never,
    },
    meta: {
      storyId: 's',
      chapterNumber: 1,
      arcId: 'a',
      hotHash: '',
      warmHash: '',
      sagaProgressPercent: null,
      arcProgressPercent: null,
      sagaProgressSource: null,
      arcProgressSource: null,
      sagaRange: null,
      arcRange: null,
      sagaPhase: null,
      arcPhase: null,
      activeTurningPoint: null,
      targetInputBudget: 100,
    },
  };
}

describe('shrinkToFit report', () => {
  it('records dropped item counts and applied actions when shrinking occurs', () => {
    const out = shrinkToFit(bigContext(), 100);
    expect(out.meta.shrinkReport).toBeDefined();
    expect(out.meta.shrinkReport!.actionsApplied.length).toBeGreaterThan(0);
    expect(out.meta.shrinkReport!.dropped.retrievedFacts).toBe(20); // high-importance facts all dropped (locked-only filter)
  });

  it('sets no report when context fits', () => {
    const ctx = bigContext();
    const out = shrinkToFit(ctx, 1_000_000);
    expect(out.meta.shrinkReport).toBeUndefined();
  });
});
