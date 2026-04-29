import { describe, expect, it } from 'vitest';
import { SagaPlannerAgent } from '../../src/agents/saga-planner.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/saga-planner.v1.ts';

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
};

const VALID_OUTPUT = JSON.stringify({
  sagas: Array.from({ length: 5 }, (_, i) => ({
    index: i,
    title: `Saga ${i}`,
    premise: 'A premise '.repeat(8).trim(),
    startChapter: i * 100 + 1,
    endChapter: (i + 1) * 100,
    expectedTurningPoints: ['first turning point event', 'second turning point event'],
  })),
  plantedSeeds: Array.from({ length: 10 }, (_, i) => ({
    seedKey: `k_${i}`,
    description: 'desc '.repeat(10).trim(),
    plantWindowStart: 1,
    plantWindowEnd: 50,
    payoffChapter: 100,
    importance: 'minor',
  })),
});

describe('SagaPlannerAgent.plan', () => {
  it('parses provider JSON output via Zod', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: VALID_OUTPUT },
    });
    const agent = new SagaPlannerAgent({ provider, logger: silentLogger });
    const r = await agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 });
    expect(r.output.sagas).toHaveLength(5);
    expect(r.output.plantedSeeds).toHaveLength(10);
    expect(r.promptVersion).toBe('v1');
  });

  it('does not send responseSchema because Google rejects the large planner schema', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: VALID_OUTPUT },
    });
    const agent = new SagaPlannerAgent({ provider, logger: silentLogger });

    await agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 });

    expect(provider.getCalls()[0]!.responseSchema).toBeUndefined();
  });

  it('parses JSON returned inside a markdown code fence', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: `\`\`\`json\n${VALID_OUTPUT}\n\`\`\`` },
    });
    const agent = new SagaPlannerAgent({ provider, logger: silentLogger });

    const r = await agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 });

    expect(r.output.sagas).toHaveLength(5);
    expect(r.output.plantedSeeds).toHaveLength(10);
  });

  it('throws when LLM returns malformed JSON', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: JSON.stringify({ sagas: [], plantedSeeds: [] }) },
    });
    const agent = new SagaPlannerAgent({ provider, logger: silentLogger });
    await expect(agent.plan({ storyId: 's', bibleCompact: 'b', targetChapters: 500 })).rejects.toThrow();
  });
});