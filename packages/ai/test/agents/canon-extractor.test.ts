import { describe, expect, it } from 'vitest';
import { CanonExtractor } from '../../src/agents/canon-extractor.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/canon-extractor.ts';
import '../../src/prompts/canon-extractor.v2.ts';

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
};

const VALID_EXTRACTOR_OUTPUT = JSON.stringify({
  characterUpdates: [{
    action: 'update',
    targetId: '11111111-1111-1111-1111-111111111111',
    name: 'Lam Trach',
    fields: { currentRealm: 'nguyên anh' },
  }],
  newCanonFacts: [{
    topic: 'Cảnh giới',
    fact: 'Lam Trach đột phá nguyên anh',
    importance: 'high',
  }],
  threadUpdates: [{
    action: 'create',
    title: 'Bí ẩn Hỏa Long',
    state: 'open',
  }],
  newTimelineEvents: [{
    description: 'Lam Trach đột phá nguyên anh',
    charactersInvolved: ['Lam Trach'],
    significance: 'major',
  }],
  seedsResolvedThisChapter: [],
});

describe('CanonExtractor', () => {
  it('parses valid mocked JSON output', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: VALID_EXTRACTOR_OUTPUT },
    });
    const extractor = new CanonExtractor({ provider, logger: silentLogger });
    const r = await extractor.extract({
      chapterNumber: 5,
      chapterContent: 'Nội dung chương...',
      bibleCompact: 'Bible compact',
      canonSnapshot: 'Snapshot',
      plantedSeeds: [],
      recentSummary: 'Summary',
    }, { traceId: 't', storyId: 's' });

    expect(r.output.characterUpdates).toHaveLength(1);
    expect(r.output.characterUpdates[0]!.fields.currentRealm).toBe('nguyên anh');
    expect(r.output.newCanonFacts).toHaveLength(1);
    expect(r.output.newCanonFacts[0]!.fact).toBe('Lam Trach đột phá nguyên anh');
    expect(r.output.threadUpdates).toHaveLength(1);
    expect(r.output.newTimelineEvents).toHaveLength(1);
    expect(r.promptVersion).toBe('v2');
  });

  it('throws on schema-invalid JSON', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: '{"characterUpdates":"not an array"}' },
    });
    const extractor = new CanonExtractor({ provider, logger: silentLogger });
    await expect(extractor.extract({
      chapterNumber: 5,
      chapterContent: 'Content',
      bibleCompact: 'Bible',
      canonSnapshot: 'Snap',
      plantedSeeds: [],
      recentSummary: 'Sum',
    }, { traceId: 't', storyId: 's' })).rejects.toThrow();
  });
});
