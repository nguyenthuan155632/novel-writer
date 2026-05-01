import { describe, expect, it } from 'vitest';
import { PacketGenerator } from '../../src/agents/packet-generator.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/packet-generator.v2.ts';

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
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
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
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' })).rejects.toThrow();
  });

  it('truncates overlong fields before schema parsing', async () => {
    const overlong = JSON.stringify({
      chapterNumber: 4,
      goal: 'g'.repeat(700),
      requiredEvents: [{ description: 'e'.repeat(350) }],
      charactersPresent: ['Lam Pham'],
      conflict: 'c'.repeat(700),
      cliffhanger: 'h'.repeat(350),
      forbiddenMoves: [],
      notes: 'n'.repeat(700),
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: overlong },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 4, arcGoals: 'g',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' });

    expect(r.packet.goal.length).toBeLessThanOrEqual(500);
    expect(r.packet.conflict.length).toBeLessThanOrEqual(500);
    expect(r.packet.cliffhanger.length).toBeLessThanOrEqual(500);
    expect(r.packet.requiredEvents[0]?.description.length).toBeLessThanOrEqual(500);
    expect(r.packet.notes?.length ?? 0).toBeLessThanOrEqual(500);
    expect(provider.getCalls().length).toBe(2);
  });
});