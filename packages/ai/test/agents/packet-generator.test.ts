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

  it('includes packet planning context in the JSON repair call', async () => {
    let callCount = 0;
    const provider = new MockProvider({
      responder: {
        kind: 'fn',
        fn: () => {
          callCount++;
          return {
            content: callCount === 1 ? '{"chapterNumber":' : VALID_PACKET,
            usage: {
              inputTokens: 100,
              outputTokens: 50,
              cachedInputTokens: 0,
            },
            finishReason: 'stop',
            raw: { mocked: true },
          };
        },
      },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });

    await gen.generate({
      bibleCompact: 'BIBLE_MARKER long-term world constraints',
      arcSummary: 'ARC_MARKER current arc plan',
      recentChapterSummaries: [{ chapterNumber: 3, summary: 'RECENT_MARKER' }],
      activeCharacters: [
        {
          name: 'Lam Trach',
          currentRealm: 'none',
          status: 'alive',
          faction: 'Night Bureau',
        },
      ],
      openThreads: [{ title: 'THREAD_MARKER missing witness', state: 'open' }],
      duePlantedSeeds: [
        {
          id: 'seed-1',
          seedText: 'SEED_MARKER red umbrella',
          payoffDescription: 'reveals assassin',
          plantWindowEnd: 5,
        },
      ],
      overdueThreads: [],
      forbiddenRules: 'FORBIDDEN_MARKER do not resolve betrayal',
      chapterNumber: 5,
      arcGoals: 'PROGRESS_MARKER arc 5/10 source=planned_range',
      genreDef: { slug: 'do_thi', viLabel: 'Đô thị', viDescription: '', family: 'urban', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: { pov: 'first', tone: 'dark' } as any,
    }, { traceId: 't', storyId: 's' });

    const repairCall = provider.getCalls()[1];
    const repairUser = repairCall?.messages.find((m) => m.role === 'user')?.content ?? '';

    expect(repairUser).toContain('# PACKET REPAIR CONTEXT');
    expect(repairUser).toContain('BIBLE_MARKER');
    expect(repairUser).toContain('ARC_MARKER');
    expect(repairUser).toContain('RECENT_MARKER');
    expect(repairUser).toContain('THREAD_MARKER');
    expect(repairUser).toContain('SEED_MARKER');
    expect(repairUser).toContain('FORBIDDEN_MARKER');
    expect(repairUser).toContain('PROGRESS_MARKER');
    expect(repairUser).toContain('STORY OPTIONS');
  });
});
