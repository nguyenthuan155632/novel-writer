import { describe, it, expect, vi } from 'vitest';
import { ArcPlannerAgent } from '../../src/agents/arc-planner.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/arc-planner.v1.ts';

const silentLogger: Logger = { child: () => silentLogger, error: () => {}, info: () => {} };

const VALID_OUTPUT = JSON.stringify({
  arcs: Array.from({ length: 3 }, (_, i) => ({
    index: i, title: `Arc ${i}`, premise: 'p '.repeat(30).trim(),
    startChapter: i * 33 + 1, endChapter: (i + 1) * 33,
    expectedChanges: ['change happens here enough text'],
  })),
});

let selectCallCount = 0;
vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return { from: () => ({ where: () => ({ limit: async () => [{ id: 'sa', startChapter: 1, endChapter: 100, title: 'S', premise: 'p', expectedTurningPoints: ['t1', 't2'] }] }) }) };
      }
      return { from: () => ({ where: async () => [] }) };
    },
    transaction: async (fn: Function) => fn({ insert: async () => {}, update: async () => {}, select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) }),
  }),
}));

vi.mock('@novel/db/schema', () => ({
  schema: { sagas: {} as any, plantedSeeds: {} as any, arcs: {} as any },
}));

describe('ArcPlannerAgent.plan (mocked db)', () => {
  it('parses output via Zod', async () => {
    selectCallCount = 0;
    const provider = new MockProvider({ responder: { kind: 'fixed', content: VALID_OUTPUT } });
    const agent = new ArcPlannerAgent({ provider, logger: silentLogger });
    const r = await agent.plan({ storyId: 's', sagaId: 'sa', currentState: 'state' });
    expect(r.output.arcs).toHaveLength(3);
  });
});