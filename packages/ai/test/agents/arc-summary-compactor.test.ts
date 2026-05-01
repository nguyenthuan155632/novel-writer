import { describe, it, expect } from 'vitest';
import { ArcSummaryCompactorAgent } from '../../src/agents/arc-summary-compactor.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/arc-summary-compactor.v1.ts';

const silentLogger: Logger = { child: () => silentLogger, error: () => {}, info: () => {} };

describe('ArcSummaryCompactorAgent.compact', () => {
  it('returns trimmed text and usage', async () => {
    const provider = new MockProvider({ responder: { kind: 'fixed', content: '  arc summary text  ' } });
    const agent = new ArcSummaryCompactorAgent({ provider, logger: silentLogger });
    const r = await agent.compact({ storyId: 's', arcTitle: 'Arc 1', perChapterSummaries: [{ chapterNumber: 1, summary: 'sum' }] });
    expect(r.summary).toBe('arc summary text');
  });

  it('uses the injected model route', async () => {
    const provider = new MockProvider({ responder: { kind: 'fixed', content: 'arc summary text' } });
    const agent = new ArcSummaryCompactorAgent({ provider, logger: silentLogger, model: 'gemma4:e4b' });

    await agent.compact({ storyId: 's', arcTitle: 'Arc 1', perChapterSummaries: [{ chapterNumber: 1, summary: 'sum' }] });

    expect(provider.getCalls()[0]!.model).toBe('gemma4:e4b');
  });
});
