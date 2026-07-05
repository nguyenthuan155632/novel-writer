import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arcs,
  chapters,
  chapterPackets,
  chapterSummaries,
  plantedSeeds,
  sagas,
  validations,
} from '@novel/db/schema';

const mockPacketGenerate = vi.fn();
const mockWriterWrite = vi.fn();
const mockLlmValidate = vi.fn();
const mockAutoFix = vi.fn();
const mockCanonExtract = vi.fn();
const mockCanonMergerSubmit = vi.fn();
const mockSummaryCompact = vi.fn();
const mockGetArcById = vi.fn();
const mockGetArcForChapter = vi.fn();
const mockGetSagaForChapter = vi.fn();
const mockGetStoryBible = vi.fn();
const mockBuildContext = vi.fn();
const mockAuditPacket = vi.fn();
const mockBuildChecks = vi.fn();
const mockRunDeterministicValidator = vi.fn();
const mockOpenAICompatibleProvider = vi.fn();
const mockOpenRouterProvider = vi.fn();
const mockOllamaProvider = vi.fn();
const mockVmlxProvider = vi.fn();
const mockEnqueueHighStakesReview = vi.fn().mockResolvedValue('review-job-1');
const mockEnqueueRefreshArcSummary = vi.fn().mockResolvedValue('refresh-job-1');
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

const usage = { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 };

const packet = {
  chapterNumber: 5,
  goal: 'Reach the archive',
  requiredEvents: [{ description: 'Lam Trach enters the archive' }],
  charactersPresent: ['Lam Trach'],
  conflict: 'The gate refuses him',
  cliffhanger: 'The archive opens from inside',
  forbiddenMoves: [],
  seedsAutoEnforced: [],
};

const bible = {
  worldRules: '',
  forbiddenRules: '',
  styleGuide: '',
  powerSystem: null,
  powerSystemKind: null,
  cultivationSystem: null,
  bloodlineSystem: null,
  compactSummary: 'Bible compact',
  styleFewShots: [],
};

const arc = {
  id: '00000000-0000-0000-0000-0000000000a1',
  storyId: '00000000-0000-0000-0000-000000000001',
  sagaId: '00000000-0000-0000-0000-0000000000b1',
  title: 'Archive arc',
  premise: 'Find the archive',
  startChapter: 1,
  endChapter: 10,
  mainConflict: 'Locked archive',
  expectedChanges: ['Archive is opened'],
  completedChanges: [],
  expectedPowerChanges: [],
  expectedCharacterChanges: [],
  rollingSummary: null,
};

const saga = {
  id: '00000000-0000-0000-0000-0000000000b1',
  storyId: '00000000-0000-0000-0000-000000000001',
  premise: 'Archive saga',
  startChapter: 1,
  endChapter: 20,
  expectedTurningPoints: ['Archive opens'],
  completedTurningPoints: [],
  rollingSummary: null,
};

function makeContext() {
  return {
    hot: {
      systemRules: '',
      bibleCompact: 'Bible compact',
      styleGuide: '',
      powerSystem: '',
      powerSystemKind: 'none',
      styleFewShots: [],
      genreContract: '',
      personalityContract: '',
      storyOptionsBlock: '',
    },
    warm: {
      sagaSummary: '',
      arcSummary: '',
      activeCharacters: [],
      arcOpenThreads: [],
      arcPlantedSeeds: [],
      parallelThreads: [],
      knownFactions: [],
    },
    cold: {
      recentSummaries: [],
      retrievedFacts: [],
      retrievedPastChapters: [],
      seedsToPlantNow: [],
      timelineEvents: [],
      pendingCanonUpdates: [],
      packet,
    },
    meta: {
      storyId: '00000000-0000-0000-0000-000000000001',
      chapterNumber: 5,
      arcId: arc.id,
      hotHash: 'hot',
      warmHash: 'warm',
      sagaProgressPercent: null,
      arcProgressPercent: null,
      sagaProgressSource: null,
      arcProgressSource: null,
      sagaRange: null,
      arcRange: null,
      sagaPhase: null,
      arcPhase: null,
      activeTurningPoint: null,
      targetInputBudget: 6000,
    },
  };
}

function makeRecordingDb(options: { existingChapter?: Record<string, unknown> } = {}) {
  const inserts: { table: unknown; value: unknown }[] = [];
  const updates: { table: unknown; value: Record<string, unknown> }[] = [];
  const deletes: { table: unknown }[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => options.existingChapter ? [options.existingChapter] : [],
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (value: unknown) => {
        inserts.push({ table, value });
        return {
          returning: async () => [{ id: '00000000-0000-0000-0000-0000000000c1' }],
        };
      },
    }),
    update: (table: unknown) => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => {
          updates.push({ table, value });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: async () => {
        deletes.push({ table });
      },
    }),
  };
  return { db, inserts, updates, deletes };
}

vi.mock('@novel/ai', () => ({
  decideChapterGenerationMode: vi.fn().mockReturnValue('standard'),
  PacketGenerator: class {
    generate = mockPacketGenerate;
  },
  WriterAgent: class {
    write = mockWriterWrite;
  },
  LlmValidatorAgent: class {
    validate = mockLlmValidate;
  },
  AutoFixerAgent: class {
    fix = mockAutoFix;
  },
  CanonExtractor: class {
    extract = mockCanonExtract;
  },
  SummaryCompactor: class {
    compact = mockSummaryCompact;
  },
  CanonMerger: class {
    submit = mockCanonMergerSubmit;
  },
  PolishPassAgent: class {},
  SlotStructureAgent: class {},
  SlotCharacterAgent: class {},
  SlotSceneAgent: class {},
  SlotSynthesisAgent: class {},
  findAntiLlmPatternHits: vi.fn().mockReturnValue([]),
  OpenRouterEmbeddingService: class {},
  MockEmbeddingService: class {},
  auditPacket: mockAuditPacket,
  buildChecks: mockBuildChecks,
  runDeterministicValidator: mockRunDeterministicValidator,
  buildContext: mockBuildContext,
  getSeedsApproachingPlantDeadline: vi.fn().mockResolvedValue([]),
  extractTailContent: vi.fn().mockReturnValue(""),
  detectConflicts: vi.fn(),
  formatValidationReport: vi.fn().mockReturnValue(''),
  loadStoryDomainContext: mockLoadStoryDomainContext,
  computeProgressWindow: vi.fn().mockReturnValue(null),
  computeTurningPointStatuses: vi.fn().mockReturnValue([]),
  isThreadOverdue: vi.fn().mockReturnValue(false),
  getStoryBible: mockGetStoryBible,
  getArcById: mockGetArcById,
  getArcForChapter: mockGetArcForChapter,
  getSagaForChapter: mockGetSagaForChapter,
  getStoryTargetChapterCount: vi.fn().mockResolvedValue(100),
  getActiveCharacters: vi.fn().mockResolvedValue([]),
  getOpenThreadsForStory: vi.fn().mockResolvedValue([]),
  getPlantedSeedsForStory: vi.fn().mockResolvedValue([]),
  getSeedsDueForChapter: vi.fn().mockResolvedValue([]),
  getRecentSummaries: vi.fn().mockResolvedValue([]),
  getLockedCanonFactCandidates: vi.fn().mockResolvedValue([]),
}));

vi.mock('@novel/ai/providers/openai-compatible', () => ({
  OpenAICompatibleProvider: mockOpenAICompatibleProvider,
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

vi.mock('../../src/services/queue-publisher.js', () => ({
  enqueueHighStakesReview: mockEnqueueHighStakesReview,
  enqueueRefreshArcSummary: mockEnqueueRefreshArcSummary,
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
    delete: () => ({
      where: async () => {},
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
    mockPacketGenerate.mockReset();
    mockWriterWrite.mockReset();
    mockLlmValidate.mockReset();
    mockAutoFix.mockReset();
    mockCanonExtract.mockReset();
    mockCanonMergerSubmit.mockReset();
    mockSummaryCompact.mockReset();
    mockGetArcById.mockReset();
    mockGetArcForChapter.mockReset();
    mockGetSagaForChapter.mockReset();
    mockGetStoryBible.mockReset();
    mockBuildContext.mockReset();
    mockAuditPacket.mockReset();
    mockBuildChecks.mockReset();
    mockRunDeterministicValidator.mockReset();
    mockOpenAICompatibleProvider.mockReset();
    mockOpenRouterProvider.mockReset();
    mockOllamaProvider.mockReset();
    mockVmlxProvider.mockReset();
    mockEnqueueHighStakesReview.mockClear();
    mockEnqueueRefreshArcSummary.mockClear();
    mockOpenAICompatibleProvider.mockImplementation(function OpenAICompatibleProvider(this: object) {
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
    expect(mockOpenAICompatibleProvider).not.toHaveBeenCalled();
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
    expect(mockOpenAICompatibleProvider).not.toHaveBeenCalled();
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
    expect(mockOpenAICompatibleProvider).not.toHaveBeenCalled();
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
      delete: () => ({
        where: async () => {},
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

  it('persists the failed packet before pausing after repeated packet audit failure', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({
      pass: false,
      issues: [{ code: 'dead_character', severity: 'critical', message: 'bad packet' }],
      requiresRegenerate: true,
    });
    const { db, inserts, updates } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('paused_pending_updates');
    expect(inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapterPackets,
        value: expect.objectContaining({
          chapterNumber: 5,
          goal: packet.goal,
          conflict: packet.conflict,
          charactersInScene: packet.charactersPresent,
        }),
      }),
    ]));
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapters,
        value: expect.objectContaining({
          status: 'paused_pending_updates',
          packetAuditStatus: 'failed',
        }),
      }),
    ]));
  });

  it('clears stale validation rows when retrying an unfinished chapter', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({
      pass: false,
      issues: [{ code: 'dead_character', severity: 'critical', message: 'bad packet' }],
      requiresRegenerate: true,
    });
    const { db, deletes } = makeRecordingDb({
      existingChapter: {
        id: '00000000-0000-0000-0000-0000000000c1',
        status: 'failed',
      },
    });

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(deletes).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: validations }),
    ]));
  });

  it('persists rejected draft content and stops when non-safe LLM validation has high severity issues', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetSagaForChapter.mockResolvedValue(saga);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({ pass: true, issues: [], requiresRegenerate: false });
    mockBuildContext.mockResolvedValue(makeContext());
    mockWriterWrite.mockResolvedValue({
      title: 'Chapter 5',
      content: 'Lam Trach contradicts current canon.',
      usage,
      cost: 0,
    });
    mockBuildChecks.mockReturnValue([]);
    mockRunDeterministicValidator.mockReturnValue({
      pass: true,
      shortCircuited: false,
      pendingVerification: [],
      checks: [],
    });
    mockLlmValidate.mockResolvedValue({
      output: {
        pass: false,
        summary: 'Canon contradiction',
        issues: [
          {
            code: 'canon_character_state',
            severity: 'high',
            message: 'Character state contradicts current canon.',
          },
        ],
      },
      usage,
    });
    const { db, updates } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('failed');
    expect(mockCanonExtract).not.toHaveBeenCalled();
    expect(mockSummaryCompact).not.toHaveBeenCalled();
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapters,
        value: expect.objectContaining({
          title: 'Chapter 5',
          content: 'Lam Trach contradicts current canon.',
          status: 'failed',
          wordCount: 5,
        }),
      }),
    ]));
  });

  it('uses a fallback summary when summary compaction fails after validation', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetSagaForChapter.mockResolvedValue(saga);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({ pass: true, issues: [], requiresRegenerate: false });
    mockBuildContext.mockResolvedValue(makeContext());
    mockWriterWrite.mockResolvedValue({ title: 'Chapter 5', content: 'Chapter content', usage, cost: 0 });
    mockBuildChecks.mockReturnValue([]);
    mockRunDeterministicValidator.mockReturnValue({
      pass: true,
      shortCircuited: false,
      pendingVerification: [],
      checks: [],
    });
    mockLlmValidate.mockResolvedValue({ output: { pass: true, issues: [] }, usage });
    mockCanonExtract.mockResolvedValue({
      output: {
        characterUpdates: [],
        newCanonFacts: [],
        threadUpdates: [],
        newTimelineEvents: [],
        factionUpdates: [],
        seedsResolvedThisChapter: [],
        turningPointsCompleted: [0],
        arcChangesCompleted: [0],
      },
      usage,
    });
    mockCanonMergerSubmit.mockResolvedValue({
      pendingCount: 0,
      autoAppliedCount: 0,
      autoApprovedLowImportanceCount: 0,
      conflicts: [],
    });
    mockSummaryCompact.mockRejectedValue(new Error('summary failed'));
    const { db, inserts, updates } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('completed');
    expect(inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapterSummaries,
        value: expect.objectContaining({
          summary: expect.stringContaining('Chapter 5: Chapter content'),
        }),
      }),
    ]));
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapters,
        value: expect.objectContaining({
          status: 'completed',
          summary: expect.stringContaining('Chapter 5: Chapter content'),
        }),
      }),
    ]));
  });

  it('marks packet-enforced seeds as planted after canon merge', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetSagaForChapter.mockResolvedValue(saga);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({
      packet: {
        ...packet,
        seedsAutoEnforced: ['11111111-1111-1111-1111-111111111111'],
      },
      usage,
    });
    mockAuditPacket.mockReturnValue({ pass: true, issues: [], requiresRegenerate: false });
    mockBuildContext.mockResolvedValue(makeContext());
    mockWriterWrite.mockResolvedValue({ title: 'Chapter 5', content: 'Chapter content', usage, cost: 0 });
    mockBuildChecks.mockReturnValue([]);
    mockRunDeterministicValidator.mockReturnValue({
      pass: true,
      shortCircuited: false,
      pendingVerification: [],
      checks: [],
    });
    mockLlmValidate.mockResolvedValue({ output: { pass: true, issues: [] }, usage });
    mockCanonExtract.mockResolvedValue({
      output: {
        characterUpdates: [],
        newCanonFacts: [],
        threadUpdates: [],
        newTimelineEvents: [],
        factionUpdates: [],
        seedsResolvedThisChapter: [],
        turningPointsCompleted: [],
        arcChangesCompleted: [],
      },
      usage,
    });
    mockCanonMergerSubmit.mockResolvedValue({
      pendingCount: 0,
      autoAppliedCount: 0,
      autoApprovedLowImportanceCount: 0,
      conflicts: [],
    });
    mockSummaryCompact.mockResolvedValue({
      output: { summary: 'Compact summary', notableChanges: [] },
      usage,
    });
    const { db, updates } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('completed');
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: plantedSeeds,
        value: expect.objectContaining({
          status: 'planted',
          plantedInChapter: 5,
        }),
      }),
    ]));
  });

  it('uses an empty extraction result when canon extraction fails after validation', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetSagaForChapter.mockResolvedValue(saga);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({ pass: true, issues: [], requiresRegenerate: false });
    mockBuildContext.mockResolvedValue(makeContext());
    mockWriterWrite.mockResolvedValue({ title: 'Chapter 5', content: 'Chapter content', usage, cost: 0 });
    mockBuildChecks.mockReturnValue([]);
    mockRunDeterministicValidator.mockReturnValue({
      pass: true,
      shortCircuited: false,
      pendingVerification: [],
      checks: [],
    });
    mockLlmValidate.mockResolvedValue({ output: { pass: true, issues: [] }, usage });
    mockCanonExtract.mockRejectedValue(new Error('extractor failed'));
    mockCanonMergerSubmit.mockResolvedValue({
      pendingCount: 0,
      autoAppliedCount: 0,
      autoApprovedLowImportanceCount: 0,
      conflicts: [],
    });
    mockSummaryCompact.mockResolvedValue({
      output: { summary: 'Compact summary', notableChanges: [] },
      usage,
    });
    const { db } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('completed');
    expect(mockCanonMergerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [],
        seedsResolvedIds: [],
      }),
      expect.anything(),
    );
  });

  it('auto-fixes deterministic target word-count issues even when LLM validation passes', async () => {
    mockGetArcById.mockResolvedValue(arc);
    mockGetSagaForChapter.mockResolvedValue(saga);
    mockGetStoryBible.mockResolvedValue(bible);
    mockPacketGenerate.mockResolvedValue({ packet, usage });
    mockAuditPacket.mockReturnValue({ pass: true, issues: [], requiresRegenerate: false });
    mockBuildContext.mockResolvedValue(makeContext());
    mockWriterWrite.mockResolvedValue({ title: 'Chapter 5', content: 'Short draft', usage, cost: 0 });
    mockBuildChecks.mockReturnValue([]);
    mockRunDeterministicValidator.mockReturnValue({
      pass: false,
      shortCircuited: false,
      pendingVerification: [],
      checks: [
        {
          id: 'word_count_target',
          severity: 'medium',
          pass: false,
          issues: ['Chương dưới mục tiêu: 1539 từ.'],
        },
      ],
    });
    mockLlmValidate.mockResolvedValue({ output: { pass: true, issues: [] }, usage });
    mockAutoFix.mockResolvedValue({
      title: 'Chapter 5',
      content: 'Expanded draft with stronger continuity',
      usage,
      cost: 0,
    });
    mockCanonExtract.mockResolvedValue({
      output: {
        characterUpdates: [],
        newCanonFacts: [],
        threadUpdates: [],
        newTimelineEvents: [],
        factionUpdates: [],
        seedsResolvedThisChapter: [],
        turningPointsCompleted: [],
        arcChangesCompleted: [],
      },
      usage,
    });
    mockCanonMergerSubmit.mockResolvedValue({
      pendingCount: 0,
      autoAppliedCount: 0,
      autoApprovedLowImportanceCount: 0,
      conflicts: [],
    });
    mockSummaryCompact.mockResolvedValue({
      output: { summary: 'Compact summary', notableChanges: [] },
      usage,
    });
    const { db, updates } = makeRecordingDb();

    const fakeLogger = { child: () => fakeLogger, info: () => {}, warn: () => {}, error: () => {} };
    const { executeGenerateChapterPipeline } = await import('../../src/jobs/generate-chapter.js');

    const result = await executeGenerateChapterPipeline(
      {
        storyId: '00000000-0000-0000-0000-000000000001',
        chapterNumber: 5,
        arcId: arc.id,
        traceId: 'trace-1',
        mode: 'full_auto',
      } as any,
      {
        db: db as any,
        provider: {} as any,
        embeddingService: {} as any,
        logger: fakeLogger as any,
        mode: 'full_auto',
      },
    );

    expect(result.status).toBe('completed');
    expect(mockAutoFix).toHaveBeenCalledWith(expect.objectContaining({
      chapterContent: 'Short draft',
      issues: [expect.objectContaining({ code: 'word_count_target' })],
    }));
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: chapters,
        value: expect.objectContaining({
          content: 'Expanded draft with stronger continuity',
          status: 'completed',
        }),
      }),
    ]));
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
