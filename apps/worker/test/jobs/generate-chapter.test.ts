import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetArcForChapter = vi.fn();

vi.mock('@novel/ai', () => ({
  PacketGenerator: class {},
  WriterAgent: class {},
  LlmValidatorAgent: class {},
  AutoFixerAgent: class {},
  CanonExtractor: class {},
  SummaryCompactor: class {},
  CanonMerger: class {},
  OpenRouterEmbeddingService: class {},
  MockEmbeddingService: class {},
  auditPacket: vi.fn(),
  buildChecks: vi.fn(),
  runDeterministicValidator: vi.fn(),
  buildContext: vi.fn(),
  detectConflicts: vi.fn(),
  getStoryBible: vi.fn().mockResolvedValue(null),
  getArcById: vi.fn(),
  getArcForChapter: mockGetArcForChapter,
  getActiveCharacters: vi.fn().mockResolvedValue([]),
  getOpenThreadsForStory: vi.fn().mockResolvedValue([]),
  getPlantedSeedsForStory: vi.fn().mockResolvedValue([]),
  getSeedsDueForChapter: vi.fn().mockResolvedValue([]),
  getRecentSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock('@novel/ai/providers/openrouter', () => ({
  OpenRouterProvider: class {},
}));

vi.mock('@novel/ai/llm-call-logger', () => ({
  LoggedLLMProvider: class {},
  makeDrizzleRecorder: () => async () => {},
}));

describe('executeGenerateChapterPipeline', () => {
  beforeEach(() => {
    mockGetArcForChapter.mockReset();
  });

  it('resolves arcId for jobs enqueued without one before inserting chapter rows', async () => {
    mockGetArcForChapter.mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000a1' });

    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          expect(value).not.toHaveProperty('arcId', undefined);
          return {
            returning: async () => [{ id: '00000000-0000-0000-0000-0000000000c1' }],
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => {},
        }),
      }),
    };

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    await expect(executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 1,
        traceId: 'trace-1',
        mode: 'safe',
      } as any,
      {
        db: fakeDb as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'safe',
      },
    )).rejects.toThrow(/No story bible found/);

    expect(mockGetArcForChapter).toHaveBeenCalledWith(
      fakeDb,
      '00000000-0000-0000-0000-000000000001',
      1,
    );
  });

  it('rejects jobs that have no planned arc for the chapter', async () => {
    mockGetArcForChapter.mockResolvedValue(null);
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: (_value: Record<string, unknown>) => {
          return {
            returning: async () => [{ id: '00000000-0000-0000-0000-0000000000c1' }],
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => {},
        }),
      }),
    };

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    await expect(executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 1,
        traceId: 'trace-1',
        mode: 'safe',
      } as any,
      {
        db: fakeDb as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'safe',
      },
    )).rejects.toThrow(/No arc found/);
  });
});
