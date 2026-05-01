import { describe, it, expect, vi } from 'vitest';
import { generateBible } from '../../src/agents/bible-generator.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import { LoggedLLMProvider } from '../../src/llm-call-logger.ts';
import '../../src/prompts/bible-generator.v2.ts';

const VALID_BIBLE_JSON = JSON.stringify({
  world_rules: 'A'.repeat(200),
  power_system: 'B'.repeat(200),
  power_system_kind: 'cultivation',
  cultivation_system: 'C'.repeat(200),
  style_guide: 'D'.repeat(120),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: 'F'.repeat(60),
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

    expect(r.bible.world_rules).toMatch(/^A+$/);
    expect(r.usage.inputTokens).toBeGreaterThan(0);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0]![0].agentRole).toBe('bible_generator');
    expect(recorder.mock.calls[0]![0].promptVersion).toBe('v2');
  });

  it('throws ZodError on invalid JSON', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({ responder: { kind: 'fixed', content: '{"world_rules":"too short"}' } });
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