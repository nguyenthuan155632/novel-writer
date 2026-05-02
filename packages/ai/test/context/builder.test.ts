import { describe, expect, it, vi } from 'vitest';
import { buildContext } from '../../src/context/builder.js';
import type { ChapterPacket } from '../../src/schemas/packet.js';
import type { EmbeddingService, EmbeddingResponse } from '../../src/embeddings/types.js';
import type { CharacterCompact, ThreadCompact, SeedCompact, ChapterSummaryCompact, CanonFactCompact, FactionCompact } from '../../src/context/types.js';

vi.mock('../../src/context/retrieval.js', () => ({
  getStoryBible: vi.fn().mockResolvedValue(null),
  getSagaForChapter: vi.fn().mockResolvedValue(null),
  getArcById: vi.fn().mockResolvedValue(null),
  getActiveCharacters: vi.fn().mockResolvedValue([] as CharacterCompact[]),
  getOpenThreadsForStory: vi.fn().mockResolvedValue([] as ThreadCompact[]),
  getPlantedSeedsForStory: vi.fn().mockResolvedValue([] as SeedCompact[]),
  getSeedsDueForChapter: vi.fn().mockResolvedValue([] as SeedCompact[]),
  getRecentSummaries: vi.fn().mockResolvedValue([] as ChapterSummaryCompact[]),
  getTopKCanonFacts: vi.fn().mockResolvedValue([] as CanonFactCompact[]),
  getPastChapterSummaries: vi.fn().mockResolvedValue([] as ChapterSummaryCompact[]),
  getFactionsForStory: vi.fn().mockResolvedValue([] as FactionCompact[]),
}));

const mockEmbeddingService: EmbeddingService = {
  async embed(): Promise<EmbeddingResponse> {
    return {
      vector: new Array(1536).fill(0.1),
      model: 'test',
      usage: { tokens: 10 },
      cost: 0,
    };
  },
};

const samplePacket: ChapterPacket = {
  chapterNumber: 10,
  goal: 'Hero discovers the truth',
  requiredEvents: [],
  charactersPresent: ['Linh'],
  conflict: 'Internal struggle',
  cliffhanger: 'Unexpected revelation',
  forbiddenMoves: [],
};

const baseDeps = {
  db: {} as any,
  storyId: 'story-1',
  chapterNumber: 10,
  arcId: 'arc-1',
  chapterId: 'chapter-1',
  packet: samplePacket,
  embeddingService: mockEmbeddingService,
  traceId: 'trace-1',
  domain: {
    genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
    personalityDef: { slug: 'tram_on', viLabel: '', viDescription: '', voiceHints: '', decisionStyle: '', dialogueStyle: '', conflictResponse: '', driftSignals: [] } as any,
    storyOptions: {} as any,
    genreFamily: 'cultivation' as any,
  },
};

describe('buildContext', () => {
  it('returns empty hot tier when no bible found', async () => {
    const result = await buildContext(baseDeps);
    expect(result.hot.systemRules).toBe('');
    expect(result.hot.bibleCompact).toBe('');
    expect(result.meta.storyId).toBe('story-1');
    expect(result.meta.chapterNumber).toBe(10);
    expect(result.meta.arcId).toBe('arc-1');
  });

  it('includes hot hash and warm hash in meta', async () => {
    const result = await buildContext(baseDeps);
    expect(result.meta.hotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.meta.warmHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('includes packet in cold tier', async () => {
    const result = await buildContext(baseDeps);
    expect(result.cold.packet).toEqual(samplePacket);
  });

  it('uses embedding service for canon fact retrieval', async () => {
    const embedSpy = vi.spyOn(mockEmbeddingService, 'embed');
    await buildContext(baseDeps);
    expect(embedSpy).toHaveBeenCalledWith({
      input: samplePacket.goal,
      traceId: 'trace-1',
    });
  });
});