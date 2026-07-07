import { describe, expect, it } from 'vitest';
import { ChapterPacketSchema } from '../../src/schemas/packet.ts';

describe('ChapterPacketSchema', () => {
  it('accepts minimal valid packet', () => {
    const out = ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: 'c', forbiddenMoves: [],
    });
    expect(out.chapterNumber).toBe(1);
    expect(out.chapterPurpose).toBe('plot_progression');
    expect(out.endingMode).toBe('quiet_transition');
  });

  it('rejects empty conflict', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: '', forbiddenMoves: [],
    })).toThrow();
  });

  it('rejects > 8 required events', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g',
      requiredEvents: Array.from({ length: 9 }, () => ({ description: 'x' })),
      charactersPresent: [], conflict: 'c', forbiddenMoves: [],
    })).toThrow();
  });

  it('accepts optional narrative purpose and soft ending mode', () => {
    const out = ChapterPacketSchema.parse({
      chapterNumber: 2,
      goal: 'let the protagonist learn the market routine',
      requiredEvents: [],
      charactersPresent: ['Linh'],
      conflict: 'minor embarrassment while learning a trade',
      chapterPurpose: 'slice_of_life',
      endingMode: 'emotional_aftertaste',
      forbiddenMoves: [],
    });
    expect(out.chapterPurpose).toBe('slice_of_life');
    expect(out.endingMode).toBe('emotional_aftertaste');
    expect(out.cliffhanger).toBeUndefined();
  });

  it('§1.9 seedsAutoEnforced defaults to [] and round-trips', () => {
    // LLM output without seedsAutoEnforced → defaults to []
    const out = ChapterPacketSchema.parse({
      chapterNumber: 3, goal: 'find artifact', requiredEvents: [], charactersPresent: [],
      conflict: 'bandits attack', forbiddenMoves: [],
    });
    expect(out.seedsAutoEnforced).toEqual([]);

    // Explicit value round-trips
    const out2 = ChapterPacketSchema.parse({
      chapterNumber: 3, goal: 'find artifact', requiredEvents: [], charactersPresent: [],
      conflict: 'bandits attack', forbiddenMoves: [],
      seedsAutoEnforced: ['seed-id-1', 'seed-id-2'],
    });
    expect(out2.seedsAutoEnforced).toEqual(['seed-id-1', 'seed-id-2']);
  });
});
