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
});