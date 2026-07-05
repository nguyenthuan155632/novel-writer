import { describe, it, expect, vi } from 'vitest';
import { generateBible } from '../../src/agents/bible-generator.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import { LoggedLLMProvider } from '../../src/llm-call-logger.ts';
import '../../src/prompts/bible-generator.v2.ts';

const words = (count: number, prefix: string): string =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ') + '.';

const VALID_BIBLE_JSON = JSON.stringify({
  world_rules: words(200, 'world'),
  power_system: words(200, 'power'),
  power_system_kind: 'cultivation',
  cultivation_system: words(200, 'cultivation'),
  style_guide: words(100, 'style'),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: words(100, 'ending'),
  compact_summary: 'G'.repeat(120),
});

describe('generateBible', () => {
  it('returns parsed bible from provider', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({ responder: { kind: 'fixed', content: VALID_BIBLE_JSON } });
    const provider = new LoggedLLMProvider({ inner, recordCall: recorder });

    const r = await generateBible({
      provider,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', target_chapter_count: 1000, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 'trace-x',
    });

    expect(r.bible.world_rules).toMatch(/^world0/);
    expect(r.usage.inputTokens).toBeGreaterThan(0);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0]![0].agentRole).toBe('bible_generator');
    expect(recorder.mock.calls[0]![0].promptVersion).toBe('v2');
  });

  it('does not cap the output budget for bible generation', async () => {
    const inner = new MockProvider({ responder: { kind: 'fixed', content: VALID_BIBLE_JSON } });

    await generateBible({
      provider: inner,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', target_chapter_count: 1000, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 'trace-x',
    });

    expect(inner.getCalls()[0]!.maxOutputTokens).toBeUndefined();
  });

  it('does not retry solely because generated sections are short', async () => {
    let attempts = 0;
    const inner = new MockProvider({
      responder: {
        kind: 'fn',
        fn: () => {
          attempts++;
          const content = JSON.stringify({
            world_rules: 'short',
            power_system: 'short',
            power_system_kind: 'cultivation',
            cultivation_system: 'short',
            style_guide: 'short',
            forbidden_rules: 'short',
            ending_direction: 'short',
            compact_summary: 'short',
          });
          return {
            content,
            usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
            finishReason: 'stop',
            raw: { mocked: true },
          };
        },
      },
    });

    const result = await generateBible({
      provider: inner,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', target_chapter_count: 1000, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 'trace-x',
    });

    expect(attempts).toBe(1);
    expect(result.bible.power_system).toBe('short');
  });

  it('normalizes array text sections from provider JSON', async () => {
    const inner = new MockProvider({
      responder: {
        kind: 'fixed',
        content: JSON.stringify({
          world_rules: 'short',
          power_system: 'short',
          power_system_kind: 'cultivation',
          cultivation_system: 'short',
          style_guide: 'short',
          forbidden_rules: ['Không có súng đạn hiện đại.', 'Không có AI hoặc internet.'],
          ending_direction: 'short',
          compact_summary: 'short',
        }),
      },
    });

    const result = await generateBible({
      provider: inner,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', target_chapter_count: 1000, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 'trace-x',
    });

    expect(result.bible.forbidden_rules).toBe('Không có súng đạn hiện đại.\nKhông có AI hoặc internet.');
  });

  it('requires cultivation_system in provider schema for cultivation genres', async () => {
    const inner = new MockProvider({ responder: { kind: 'fixed', content: VALID_BIBLE_JSON } });

    await generateBible({
      provider: inner,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', target_chapter_count: 1000, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 'trace-x',
    });

    expect(inner.getCalls()[0]!.responseSchema?.required).toContain('cultivation_system');
  });

  it('throws ZodError on invalid JSON', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({ responder: { kind: 'fixed', content: '{"world_rules":' } });
    const provider = new LoggedLLMProvider({ inner, recordCall: recorder });

    await expect(generateBible({
      provider,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'p', target_chapter_count: 100, genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any, personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any, storyOptions: {} as any },
      traceId: 't',
    })).rejects.toThrow();
    expect(recorder).toHaveBeenCalledTimes(1);
  });
});
