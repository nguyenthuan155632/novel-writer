import { CONTEXT_CONFIG, type ContextConfig } from '@novel/core';
import type { Db } from '@novel/db';
import type { EmbeddingService } from '../embeddings/types.js';
import type { ChapterPacket } from '../schemas/packet.js';
import type { ChapterContext, HotTier, WarmTier, ColdTier, StyleFewShot, SeedCompact, CanonFactCompact } from './types.js';
import { computeHotHash, computeWarmHash } from './cache-keys.js';
import {
  getStoryBible, getSagaForChapter, getArcById, getActiveCharacters,
  getOpenThreadsForStory, getSeedsDueForChapter, getRecentSummaries,
  getTopKCanonFacts, getPastChapterSummaries, getPlantedSeedsForStory,
} from './retrieval.js';
import { shrinkToFit } from './shrink.js';

interface BuilderLogger {
  child(bindings: Record<string, unknown>): BuilderLogger;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export type BuildContextDeps = {
  db: Db;
  storyId: string;
  chapterNumber: number;
  arcId: string;
  chapterId: string;
  packet: ChapterPacket;
  embeddingService: EmbeddingService;
  traceId: string;
  config?: Partial<ContextConfig>;
  logger?: BuilderLogger;
};

export async function buildContext(deps: BuildContextDeps): Promise<ChapterContext> {
  const cfg = { ...CONTEXT_CONFIG, ...deps.config };
  const { db, storyId, chapterNumber, arcId, packet, embeddingService, traceId, logger: log } = deps;

  const bible = await getStoryBible(db, storyId);

  const hot = buildHotTier(bible, cfg);

  const [saga, arc] = await Promise.all([
    getSagaForChapter(db, storyId, chapterNumber),
    getArcById(db, arcId),
  ]);

  const [characters, threads, allSeeds, dueSeeds, recentSummaries] = await Promise.all([
    getActiveCharacters(db, storyId, chapterNumber),
    getOpenThreadsForStory(db, storyId),
    getPlantedSeedsForStory(db, storyId),
    getSeedsDueForChapter(db, storyId, chapterNumber),
    getRecentSummaries(db, storyId, chapterNumber, cfg.RECENT_CHAPTER_SUMMARIES_COUNT),
  ]);

  const arcSeeds = filterArcSeeds(allSeeds, chapterNumber);

  const warm: WarmTier = {
    sagaSummary: saga?.rollingSummary ?? '',
    arcSummary: arc?.rollingSummary ?? arc?.summary ?? '',
    activeCharacters: characters,
    arcOpenThreads: threads,
    arcPlantedSeeds: arcSeeds,
  };

  const goalText = packet.goal;
  let retrievedFacts: CanonFactCompact[] = [];
  try {
    const embResp = await embeddingService.embed({
      input: goalText,
      traceId,
    });
    retrievedFacts = await getTopKCanonFacts(
      db, storyId, embResp.vector,
      cfg.RETRIEVED_CANON_FACTS_TOP_K,
      [...cfg.RETRIEVAL_MIN_IMPORTANCE],
    );
  } catch (err) {
    log?.warn({ err, storyId, chapterNumber }, 'embedding lookup failed, skipping canon facts');
  }

  const pastChapterSummaries = await getPastChapterSummaries(
    db, storyId, chapterNumber,
    cfg.RETRIEVED_PAST_CHAPTERS_MIN_GAP,
    cfg.RETRIEVED_PAST_CHAPTERS_TOP_K,
  );

  const cold: ColdTier = {
    recentSummaries,
    retrievedFacts,
    retrievedPastChapters: pastChapterSummaries,
    seedsToPlantNow: dueSeeds,
    packet,
  };

  const hotHash = computeHotHash(hot);
  const warmHash = computeWarmHash(warm);

  let ctx: ChapterContext = {
    hot,
    warm,
    cold,
    meta: {
      storyId,
      chapterNumber,
      arcId,
      hotHash,
      warmHash,
      targetInputBudget: cfg.TOKEN_BUDGET_NORMAL,
    },
  };

  ctx = shrinkToFit(ctx, cfg.TOKEN_BUDGET_NORMAL);

  return ctx;
}

function buildHotTier(bible: { worldRules: string; forbiddenRules: string; styleGuide: string; cultivationSystem: string; bloodlineSystem: string; compactSummary: string | null; styleFewShots: StyleFewShot[] | string[] } | null, cfg: ContextConfig): HotTier {
  if (!bible) {
    return {
      systemRules: '',
      bibleCompact: '',
      styleGuide: '',
      powerRules: '',
      styleFewShots: [],
    };
  }

  const fewShots: StyleFewShot[] = Array.isArray(bible.styleFewShots)
    ? bible.styleFewShots.map(s => typeof s === 'string' ? { excerpt: s } : s)
    : [];

  return {
    systemRules: `${bible.worldRules}\n\n# QUY TẮC CẤM\n${bible.forbiddenRules}`,
    bibleCompact: bible.compactSummary ?? '',
    styleGuide: bible.styleGuide,
    powerRules: `${bible.cultivationSystem}\n\n${bible.bloodlineSystem}`,
    styleFewShots: fewShots.slice(0, cfg.STYLE_FEWSHOT_COUNT),
  };
}

function filterArcSeeds(seeds: SeedCompact[], chapterNumber: number): SeedCompact[] {
  return seeds.filter(s =>
    s.status !== 'abandoned' && s.status !== 'paid_off' &&
    s.plantWindowStart <= chapterNumber
  );
}