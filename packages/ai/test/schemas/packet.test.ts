import { describe, expect, it } from 'vitest';
import { ChapterPacketSchema } from '../../src/schemas/packet.ts';

describe('ChapterPacketSchema', () => {
  it('accepts minimal valid packet', () => {
    const out = ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: 'c', cliffhanger: 'h', forbiddenMoves: [],
    });
    expect(out.chapterNumber).toBe(1);
  });

  it('rejects empty conflict', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g', requiredEvents: [], charactersPresent: [],
      conflict: '', cliffhanger: 'h', forbiddenMoves: [],
    })).toThrow();
  });

  it('rejects > 8 required events', () => {
    expect(() => ChapterPacketSchema.parse({
      chapterNumber: 1, goal: 'g',
      requiredEvents: Array.from({ length: 9 }, () => ({ description: 'x' })),
      charactersPresent: [], conflict: 'c', cliffhanger: 'h', forbiddenMoves: [],
    })).toThrow();
  });

  it('§1.9 seedsAutoEnforced defaults to [] and round-trips', () => {
    // LLM output without seedsAutoEnforced → defaults to []
    const out = ChapterPacketSchema.parse({
      chapterNumber: 3, goal: 'find artifact', requiredEvents: [], charactersPresent: [],
      conflict: 'bandits attack', cliffhanger: 'mysterious figure', forbiddenMoves: [],
    });
    expect(out.seedsAutoEnforced).toEqual([]);

    // Explicit value round-trips
    const out2 = ChapterPacketSchema.parse({
      chapterNumber: 3, goal: 'find artifact', requiredEvents: [], charactersPresent: [],
      conflict: 'bandits attack', cliffhanger: 'mysterious figure', forbiddenMoves: [],
      seedsAutoEnforced: ['seed-id-1', 'seed-id-2'],
    });
    expect(out2.seedsAutoEnforced).toEqual(['seed-id-1', 'seed-id-2']);
  });
});