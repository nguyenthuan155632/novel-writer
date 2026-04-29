import { describe, expect, it } from 'vitest';
import { PacketGenerator } from '../../src/agents/packet-generator.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/packet-generator.v1.ts';

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
};

const VALID_PACKET = JSON.stringify({
  chapterNumber: 1,
  goal: 'g',
  requiredEvents: [{ description: 'meet master' }],
  charactersPresent: ['Lam Trach'],
  conflict: 'c',
  cliffhanger: 'h',
  forbiddenMoves: [],
});

describe('PacketGenerator', () => {
  it('parses valid mocked JSON output', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: VALID_PACKET },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
    }, { traceId: 't', storyId: 's' });
    expect(r.packet.chapterNumber).toBe(1);
    expect(r.packet.requiredEvents).toHaveLength(1);
  });

  it('throws on schema-invalid JSON', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: '{"chapterNumber":-1}' },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    await expect(gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
    }, { traceId: 't', storyId: 's' })).rejects.toThrow();
  });
});