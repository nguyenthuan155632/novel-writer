import { describe, it, expect } from 'vitest';
import { AutoFixerAgent } from '../../src/agents/auto-fixer.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import '../../src/prompts/auto-fixer.v2.ts';

describe('AutoFixerAgent', () => {
  it('fixes chapter and parses title/content', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: 'TITLE: Chương 5 (sửa)\n\nNội dung đã sửa...' },
    });
    const agent = new AutoFixerAgent({ provider });

    const result = await agent.fix({
      serializedContext: 'context',
      chapterContent: 'original content',
      chapterTitle: 'Chương 5',
      chapterNumber: 5,
      issues: [{ code: 'dead_character', severity: 'critical', message: 'Nhân vật đã chết' }],
      storyId: 'story-1',
      traceId: 'trace-1',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
    });

    expect(result.title).toBe('Chương 5 (sửa)');
    expect(result.content).toContain('Nội dung đã sửa');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.cost).toBe(0);

    const calls = provider.getCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.metadata!.agentRole).toBe('auto_fixer');
  });
});