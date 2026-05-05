import { describe, expect, it } from 'vitest';
import { findGenre } from '@novel/core';
import { computeHotHash, computeWarmHash } from '../../src/context/cache-keys.js';
import type { HotTier, WarmTier, ChapterContext } from '../../src/context/types.js';
import { serializeContextForWriter } from '../../../../apps/worker/src/jobs/generate-chapter';
import { WRITER_SYSTEM_PROMPT_TEMPLATE, writerPromptV2 } from '../../src/prompts/writer.v2.ts';

function makeHot(): HotTier {
  return {
    systemRules: 'rules',
    bibleCompact: 'compact',
    styleGuide: 'guide',
    powerSystem: 'power',
    powerSystemKind: '',
    genreContract: '',
    personalityContract: '',
    storyOptionsBlock: '',
    styleFewShots: [],
  };
}

function makeWarm(): WarmTier {
  return {
    sagaSummary: 'saga',
    arcSummary: 'arc',
    activeCharacters: [],
    arcOpenThreads: [],
    arcPlantedSeeds: [],
  };
}

function makeContext(): ChapterContext {
  return {
    hot: makeHot(),
    warm: makeWarm(),
    cold: {
      recentSummaries: [{ chapterNumber: 9, summary: 'recent' }],
      retrievedFacts: [],
      retrievedPastChapters: [],
      seedsToPlantNow: [],
      timelineEvents: [],
      pendingCanonUpdates: [],
      packet: {
        chapterNumber: 10,
        goal: 'goal',
        requiredEvents: [],
        charactersPresent: [],
        conflict: 'conflict',
        cliffhanger: 'cliff',
        forbiddenMoves: [],
        seedsAutoEnforced: [],
      },
    },
    meta: {
      storyId: 's1',
      chapterNumber: 10,
      arcId: 'a1',
      hotHash: '',
      warmHash: '',
      sagaProgressPercent: 50,
      arcProgressPercent: 25,
      sagaProgressSource: null,
      arcProgressSource: null,
      sagaRange: '1-20',
      arcRange: '8-12',
      sagaPhase: 'development',
      arcPhase: 'setup',
      activeTurningPoint: null,
      targetInputBudget: 6000,
    },
  };
}

describe('computeHotHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = computeHotHash(makeHot());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces same hash for identical inputs', () => {
    const hot = { ...makeHot(), styleFewShots: [{ excerpt: 'test' }] };
    expect(computeHotHash(hot)).toBe(computeHotHash(hot));
  });

  it('produces different hash for different inputs', () => {
    const a = { ...makeHot(), systemRules: 'a' };
    const b = { ...makeHot(), systemRules: 'b' };
    expect(computeHotHash(a)).not.toBe(computeHotHash(b));
  });

  it('stays invariant under warm changes', () => {
    const hot = makeHot();
    const baseHash = computeHotHash(hot);
    const warmA = makeWarm();
    const warmB = { ...makeWarm(), tailContentPrev: 'bridge' };

    expect(computeWarmHash(warmA)).not.toBe(computeWarmHash(warmB));
    expect(computeHotHash(hot)).toBe(baseHash);
  });
});

describe('computeWarmHash', () => {
  const baseWarm: WarmTier = makeWarm();

  it('returns a 64-char hex string', () => {
    const hash = computeWarmHash(baseWarm);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces same hash for identical warm tiers', () => {
    expect(computeWarmHash(baseWarm)).toBe(computeWarmHash(baseWarm));
  });

  it('produces different hash when characters change', () => {
    const withChar: WarmTier = {
      ...baseWarm,
      activeCharacters: [{ id: 'c1', name: 'Linh', status: 'alive', bloodlines: [], shortTraits: [] }],
    };
    expect(computeWarmHash(baseWarm)).not.toBe(computeWarmHash(withChar));
  });

  it('changes when tailContentPrev changes', () => {
    expect(computeWarmHash(baseWarm)).not.toBe(
      computeWarmHash({ ...baseWarm, tailContentPrev: 'tail bridge' }),
    );
  });
});

describe('writer cache invariants', () => {
  it('serializes writer context with HOT sections first', () => {
    const serialized = serializeContextForWriter(makeContext());
    expect(serialized.startsWith('# SYSTEM RULES\nrules\n\n# BIBLE COMPACT\ncompact')).toBe(true);
  });

  it('keeps writer system prompt byte-identical', () => {
    const genreDef = findGenre('do_thi');
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef,
    } as unknown as Record<string, unknown>);

    expect(built.system).toBe(
      WRITER_SYSTEM_PROMPT_TEMPLATE.replace('__GENRE_LABEL__', 'Đô thị'),
    );
  });
});
