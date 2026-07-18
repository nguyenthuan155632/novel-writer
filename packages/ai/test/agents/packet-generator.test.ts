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

  it('keeps earlier non-empty goal and conflict when the model appends duplicate empty fields', async () => {
    const packetWithDuplicateEmptyFields = [
      '{',
      '"chapterNumber":1,',
      '"goal":"ghi lại một ngày thường ở kho nghĩa thương",',
      '"requiredEvents":[{"description":"Lâm Triều cân gạo và ghi sổ trong buổi sáng"}],',
      '"charactersPresent":["Lâm Triều"],',
      '"conflict":"một sai lệch nhỏ trong lượt phát gạo khiến hắn phải kiểm lại sổ",',
      '"forbiddenMoves":[],',
      '"goal":"",',
      '"conflict":""',
      '}',
    ].join('');
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: packetWithDuplicateEmptyFields },
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

    expect(r.packet.goal).toContain('ngày thường');
    expect(r.packet.conflict).toContain('sai lệch nhỏ');
  });

  it('links must-include seed ids when the model embeds the UUID in event text', async () => {
    const seedId = 'cba2f6bb-211b-4218-af76-b814252e1aa8';
    const packetWithInlineSeedId = JSON.stringify({
      chapterNumber: 6,
      goal: 'reveal the old servant',
      requiredEvents: [
        {
          description: `The old servant reveals why he waited for Mặc Lộ Đạo. (Seed: ${seedId})`,
        },
      ],
      charactersPresent: ['Lo Nhan', 'Lao tap dich'],
      conflict: 'the pursuers break into the archive',
      cliffhanger: 'the first seal opens',
      forbiddenMoves: [],
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: packetWithInlineSeedId },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 6, arcGoals: 'g',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's', mustIncludeSeeds: [{ id: seedId }] });

    expect(r.packet.requiredEvents[0]?.seedId).toBe(seedId);
    expect(r.packet.seedsAutoEnforced).toEqual([seedId]);
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
    expect(r.packet.cliffhanger?.length ?? 0).toBeLessThanOrEqual(500);
    expect(r.packet.requiredEvents[0]?.description.length).toBeLessThanOrEqual(500);
    expect(r.packet.notes?.length ?? 0).toBeLessThanOrEqual(500);
    expect(provider.getCalls().length).toBe(1);
  });

  it('normalizes common packet field drift without calling repair', async () => {
    const drifted = JSON.stringify({
      goal: 'protect Lam Da',
      requiredEvents: [{ description: 'Lam Da escapes the hunter' }],
      charactersInScene: ['Lam Da', 'Moc Linh Nhi'],
      conflict: 'hunter attacks',
      cliffhanger: 'jade pendant wakes',
      forbiddenMoves: [],
      entryState: 'continues from previous chapter',
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: drifted },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 7, arcGoals: 'g',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' });

    expect(r.packet.chapterNumber).toBe(7);
    expect(r.packet.charactersPresent).toEqual(['Lam Da', 'Moc Linh Nhi']);
    expect(r.packet.entryState?.povCharacter.name).toBe('Lam Da');
    expect(r.packet.entryState?.povCharacter.immediateGoal).toBe('protect Lam Da');
    expect(provider.getCalls()).toHaveLength(1);
  });

  it('fills missing entry state after chapter one from continuity context', async () => {
    const missingEntryState = JSON.stringify({
      chapterNumber: 3,
      goal: 'Lam Da follows the merchant back to the tea house',
      requiredEvents: [{ description: 'Lam Da keeps talking with the merchant outside the tea house.' }],
      charactersPresent: ['Lam Da'],
      conflict: 'the merchant avoids naming who threatened him',
      forbiddenMoves: [],
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: missingEntryState },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b',
      arcSummary: 'a',
      recentChapterSummaries: [],
      activeCharacters: [],
      openThreads: [],
      duePlantedSeeds: [],
      overdueThreads: [],
      prevChapterTailContent: 'Lam Da stood at the tea-house door while the merchant lowered his voice.',
      forbiddenRules: '',
      chapterNumber: 3,
      arcGoals: 'g',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' });

    expect(r.packet.entryState).toEqual(expect.objectContaining({
      timestamp: 'tiếp nối chương trước',
      povCharacter: expect.objectContaining({
        name: 'Lam Da',
        immediateGoal: 'Lam Da follows the merchant back to the tea house',
        activeKnowledge: [expect.stringContaining('tea-house door')],
      }),
    }));
  });

  it('preserves a structured entry state for the next chapter boundary', async () => {
    const packetWithEntryState = JSON.stringify({
      chapterNumber: 2,
      goal: 'Lam Da follows up on the merchant meeting',
      requiredEvents: [{ description: 'Lam Da remains at the tea house to examine the merchant ledger.' }],
      charactersPresent: ['Lam Da'],
      conflict: 'the ledger contains a price discrepancy',
      forbiddenMoves: [],
      entryState: {
        locationId: 'tea-house',
        timestamp: 'late afternoon',
        povCharacter: {
          name: 'Lam Da',
          emotionalState: 'alert',
          immediateGoal: 'verify the ledger discrepancy',
          activeKnowledge: ['the merchant changed the price'],
        },
      },
    });
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: packetWithEntryState },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 2, arcGoals: 'g',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' });

    expect(r.packet.entryState?.locationId).toBe('tea-house');
    expect(r.packet.entryState?.povCharacter.immediateGoal).toBe('verify the ledger discrepancy');
  });

  it('defaults missing charactersPresent to an empty list without calling repair', async () => {
    const missingCharacters = JSON.stringify({
      chapterNumber: 1,
      goal: 'Lam Da accidentally breaks the testing stone',
      requiredEvents: [{ description: 'Lam Da reveals unusual strength' }],
      conflict: 'the elders doubt him',
      cliffhanger: 'the jade pendant flickers',
      forbiddenMoves: [],
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: missingCharacters },
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

    expect(r.packet.charactersPresent).toEqual([]);
    expect(provider.getCalls()).toHaveLength(1);
  });

  it('drops null optional pacing fields without calling repair', async () => {
    const nullableOptionals = JSON.stringify({
      chapterNumber: 2,
      goal: 'ghi lại nhịp mở quán và một đổi thay rất nhỏ trong phố',
      requiredEvents: [{ description: 'Lâm Triều cân lại mẻ gạo mới giao trong buổi sớm' }],
      charactersPresent: ['Lâm Triều'],
      conflict: 'sổ gạo có một dòng ghi thiếu khiến cậu phải hỏi lại người giao hàng',
      cliffhanger: null,
      chapterPurpose: null,
      endingMode: null,
      forbiddenMoves: [],
    });

    const provider = new MockProvider({
      responder: { kind: 'fixed', content: nullableOptionals },
    });
    const gen = new PacketGenerator({ provider, logger: silentLogger });
    const r = await gen.generate({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [], overdueThreads: [],
      forbiddenRules: '', chapterNumber: 2, arcGoals: 'g',
      genreDef: { slug: 'do_thi', viLabel: 'Đô thị', viDescription: '', family: 'urban', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
      personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
      storyOptions: {} as any,
    }, { traceId: 't', storyId: 's' });

    expect(r.packet.cliffhanger).toBeUndefined();
    expect(r.packet.chapterPurpose).toBe('plot_progression');
    expect(r.packet.endingMode).toBe('quiet_transition');
    expect(provider.getCalls()).toHaveLength(1);
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
