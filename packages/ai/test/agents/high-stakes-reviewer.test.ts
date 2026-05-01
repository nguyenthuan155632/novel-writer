import { describe, it, expect, vi } from 'vitest';
import { HighStakesReviewerAgent } from '../../src/agents/high-stakes-reviewer.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/high-stakes-reviewer.v1.ts';

const silentLogger: Logger = { child: () => silentLogger, error: () => {}, info: () => {} };

vi.mock('@novel/db', () => ({
  getDb: () => ({
    insert: () => ({ values: () => ({ returning: async () => [{ id: 'rev-1' }] }) }),
  }),
}));
vi.mock('@novel/db/schema', () => ({
  highStakesReviews: {} as any,
}));

describe('HighStakesReviewerAgent.review', () => {
  it('persists row + returns parsed output', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: JSON.stringify({ approve: true, concerns: [], recommendedActions: [] }) },
    });
    const agent = new HighStakesReviewerAgent({ provider, logger: silentLogger });
    const r = await agent.review({
      storyId: 's', chapterId: 'c', chapterNumber: 1, triggerReason: 'manual',
      chapter: { title: 'Chapter 1', content: 'content' }, arcSummary: 'a', bibleCompact: 'b',
    });
    expect(r.reviewId).toBe('rev-1');
    expect(r.output.approve).toBe(true);
  });

  it('uses the injected model route', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: JSON.stringify({ approve: true, concerns: [], recommendedActions: [] }) },
    });
    const agent = new HighStakesReviewerAgent({ provider, logger: silentLogger, model: 'gemma4:e4b' });

    await agent.review({
      storyId: 's', chapterId: 'c', chapterNumber: 1, triggerReason: 'manual',
      chapter: { title: 'Chapter 1', content: 'content' }, arcSummary: 'a', bibleCompact: 'b',
    });

    expect(provider.getCalls()[0]!.model).toBe('gemma4:e4b');
  });
});
