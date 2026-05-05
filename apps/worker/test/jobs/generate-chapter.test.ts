import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetArcForChapter = vi.fn();
const mockOpenCodeProvider = vi.fn();
const mockOpenRouterProvider = vi.fn();
const mockOllamaProvider = vi.fn();
const mockVmlxProvider = vi.fn();
let loggedInner: unknown;

const mockLoadStoryDomainContext = vi.fn().mockResolvedValue({
  storyId: '00000000-0000-0000-0000-000000000001',
  genreDef: { id: 'xianxia', family: 'cultivation', name: 'Xianxia' },
  personalityDef: { id: 'determined', name: 'Determined' },
  storyOptions: {},
  genreFamily: 'cultivation',
});

async function expectNoArcFailureWithRetries(
  run: Promise<unknown>,
): Promise<void> {
  const assertion = expect(run).rejects.toThrow(/No arc found/);
  await vi.advanceTimersByTimeAsync(20_000);
  await assertion;
}

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
  getSeedsApproachingPlantDeadline: vi.fn().mockResolvedValue([]),
  extractTailContent: vi.fn().mockReturnValue(""),
  detectConflicts: vi.fn(),
  formatValidationReport: vi.fn().mockReturnValue(''),
  loadStoryDomainContext: mockLoadStoryDomainContext,
  computeProgressWindow: vi.fn().mockReturnValue(null),
  getStoryBible: vi.fn().mockResolvedValue(null),
  getArcById: vi.fn(),
  getArcForChapter: mockGetArcForChapter,
  getSagaForChapter: vi.fn().mockResolvedValue(null),
  getStoryTargetChapterCount: vi.fn().mockResolvedValue(100),
  getActiveCharacters: vi.fn().mockResolvedValue([]),
  getOpenThreadsForStory: vi.fn().mockResolvedValue([]),
  getPlantedSeedsForStory: vi.fn().mockResolvedValue([]),
  getSeedsDueForChapter: vi.fn().mockResolvedValue([]),
  getRecentSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock('@novel/ai/providers/opencode', () => ({
  OpenCodeProvider: mockOpenCodeProvider,
}));

vi.mock('@novel/ai/providers/openrouter', () => ({
  OpenRouterProvider: mockOpenRouterProvider,
}));

vi.mock('@novel/ai/providers/ollama', () => ({
  OllamaProvider: mockOllamaProvider,
}));

vi.mock('@novel/ai/providers/vmlx', () => ({
  VmlxProvider: mockVmlxProvider,
}));

vi.mock('@novel/ai/llm-call-logger', () => ({
  LoggedLLMProvider: class {
    constructor(opts: { inner: unknown }) {
      loggedInner = opts.inner;
    }
  },
  makeDrizzleRecorder: () => async () => {},
}));

vi.mock('@novel/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () => [{ id: '00000000-0000-0000-0000-0000000000c1' }],
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {},
      }),
    }),
  }),
}));

vi.mock('../../src/services/story-config.js', async () => {
  const core = await vi.importActual<typeof import('@novel/core')>('@novel/core');
  return {
    loadEffectiveStoryConfig: async () => ({
      model: core.MODEL_CONFIG,
      context: {},
      validation: {},
      generation: {},
      canon: {},
      queue: {},
    }),
  };
});

describe('executeGenerateChapterPipeline', () => {
  beforeEach(() => {
    mockGetArcForChapter.mockReset();
    mockOpenCodeProvider.mockReset();
    mockOpenRouterProvider.mockReset();
    mockOllamaProvider.mockReset();
    mockVmlxProvider.mockReset();
    mockOpenCodeProvider.mockImplementation(function OpenCodeProvider(this: object) {
      return this;
    });
    mockOpenRouterProvider.mockImplementation(function OpenRouterProvider(this: object) {
      return this;
    });
    mockOllamaProvider.mockImplementation(function OllamaProvider(this: object) {
      return this;
    });
    mockVmlxProvider.mockImplementation(function VmlxProvider(this: object) {
      return this;
    });
    loggedInner = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the OpenRouter provider when the job was enqueued with openrouter selected', async () => {
    vi.useFakeTimers();
    mockGetArcForChapter.mockResolvedValue(null);
    process.env.OPENROUTER_API_KEY = 'openrouter-key';

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { runGenerateChapterJob } = await import('../../src/jobs/generate-chapter.js');

    await expectNoArcFailureWithRetries(runGenerateChapterJob(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 1,
        traceId: 'trace-1',
        mode: 'safe',
        llmProvider: 'openrouter',
      } as any,
      { logger: fakeLogger as any },
    ));

    expect(mockOpenRouterProvider).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'openrouter-key',
    }));
    expect(mockOpenCodeProvider).not.toHaveBeenCalled();
    expect(mockOllamaProvider).not.toHaveBeenCalled();
    expect(loggedInner).toBeDefined();
  });

  it('uses the Ollama provider when the job was enqueued with ollama selected', async () => {
    vi.useFakeTimers();
    mockGetArcForChapter.mockResolvedValue(null);
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1';

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { runGenerateChapterJob } = await import('../../src/jobs/generate-chapter.js');

    await expectNoArcFailureWithRetries(runGenerateChapterJob(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 1,
        traceId: 'trace-1',
        mode: 'safe',
        llmProvider: 'ollama',
      } as any,
      { logger: fakeLogger as any },
    ));

    expect(mockOllamaProvider).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'http://127.0.0.1:11434/v1',
    }));
    expect(mockOpenCodeProvider).not.toHaveBeenCalled();
    expect(mockOpenRouterProvider).not.toHaveBeenCalled();
    expect(loggedInner).toBeDefined();
  });

  it('uses the vMLX provider when the job was enqueued with vmlx selected', async () => {
    vi.useFakeTimers();
    mockGetArcForChapter.mockResolvedValue(null);
    process.env.VMLX_BASE_URL = 'http://127.0.0.1:8000/v1';

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { runGenerateChapterJob } = await import('../../src/jobs/generate-chapter.js');

    await expectNoArcFailureWithRetries(runGenerateChapterJob(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 1,
        traceId: 'trace-1',
        mode: 'safe',
        llmProvider: 'vmlx',
      } as any,
      { logger: fakeLogger as any },
    ));

    expect(mockVmlxProvider).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'http://127.0.0.1:8000/v1',
    }));
    expect(mockOpenCodeProvider).not.toHaveBeenCalled();
    expect(mockOpenRouterProvider).not.toHaveBeenCalled();
    expect(mockOllamaProvider).not.toHaveBeenCalled();
    expect(loggedInner).toBeDefined();
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
