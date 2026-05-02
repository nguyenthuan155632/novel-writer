import { CONTEXT_CONFIG, type ContextConfig } from "@novel/core";
import type {
  GenreDef,
  PersonalityDef,
  StoryOptions,
  GenreFamily,
} from "@novel/core";
import type { Db } from "@novel/db";
import type { EmbeddingService } from "../embeddings/types.js";
import type { ChapterPacket } from "../schemas/packet.js";
import type {
  ChapterContext,
  HotTier,
  WarmTier,
  ColdTier,
  StyleFewShot,
  SeedCompact,
  CanonFactCompact,
  TimelineEventCompact,
} from "./types.js";
import { computeHotHash, computeWarmHash } from "./cache-keys.js";
import {
  getStoryBible,
  getSagaForChapter,
  getArcById,
  getActiveCharacters,
  getOpenThreadsForStory,
  getSeedsDueForChapter,
  getRecentSummaries,
  getTopKCanonFacts,
  getPastChapterSummaries,
  getPlantedSeedsForStory,
  getFactionsForStory,
  getTimelineEventsForChapter,
  getPendingCanonUpdatesForStory,
  getStoryTargetChapterCount,
} from "./retrieval.js";
import { shrinkToFit } from "./shrink.js";
import { renderGenreContract } from "../prompts/contracts/genre-contract.js";
import { renderPersonalityContract } from "../prompts/contracts/personality-contract.js";
import { buildStoryOptionsBlock } from "../prompts/contracts/story-options-block.js";
import { computeProgressWindow, progressPhaseFor } from "./progress.js";

export {
  computeProgressPercent,
  computeProgressWindow,
  progressPhaseFor,
  type ProgressPhase,
  type ProgressWindowSource,
} from "./progress.js";

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
  domain: {
    genreDef: GenreDef;
    personalityDef: PersonalityDef;
    storyOptions: StoryOptions;
    genreFamily: GenreFamily;
  };
  config?: Partial<ContextConfig>;
  logger?: BuilderLogger;
};

export async function buildContext(
  deps: BuildContextDeps,
): Promise<ChapterContext> {
  const cfg = { ...CONTEXT_CONFIG, ...deps.config };
  const {
    db,
    storyId,
    chapterNumber,
    arcId,
    packet,
    embeddingService,
    traceId,
    logger: log,
  } = deps;

  const bible = await getStoryBible(db, storyId);

  const hot = buildHotTier(bible, deps.domain, cfg);

  const [saga, arc, storyTargetChapterCount] = await Promise.all([
    getSagaForChapter(db, storyId, chapterNumber),
    getArcById(db, arcId),
    getStoryTargetChapterCount(db, storyId),
  ]);

  const [
    characters,
    threads,
    allSeeds,
    dueSeeds,
    recentSummaries,
    knownFactions,
    timelineEventsRows,
    pendingCanonUpdatesRows,
  ] = await Promise.all([
    getActiveCharacters(db, storyId, chapterNumber),
    getOpenThreadsForStory(db, storyId),
    getPlantedSeedsForStory(db, storyId),
    getSeedsDueForChapter(db, storyId, chapterNumber),
    getRecentSummaries(
      db,
      storyId,
      chapterNumber,
      cfg.RECENT_CHAPTER_SUMMARIES_COUNT,
    ),
    getFactionsForStory(db, storyId),
    getTimelineEventsForChapter(db, storyId, chapterNumber),
    getPendingCanonUpdatesForStory(db, storyId),
  ]);

  const arcSeeds = filterArcSeeds(allSeeds, chapterNumber);

  const sagaPlanText = [
    saga?.premise ? `Premise saga: ${saga.premise}` : "",
    Array.isArray(saga?.expectedTurningPoints) &&
    (saga.expectedTurningPoints as string[]).length > 0
      ? `Turning points (nên theo thứ tự):\n${(saga.expectedTurningPoints as string[]).map((tp, i) => `  ${i + 1}. ${tp}`).join("\n")}`
      : "",
    saga?.rollingSummary ? `Đã xảy ra (rolling):\n${saga.rollingSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const arcExpectedChanges = Array.isArray(arc?.expectedChanges)
    ? (arc.expectedChanges as string[])
    : [];
  const arcExpectedPower = Array.isArray(arc?.expectedPowerChanges)
    ? (arc.expectedPowerChanges as string[])
    : [];
  const arcExpectedChar = Array.isArray(arc?.expectedCharacterChanges)
    ? (arc.expectedCharacterChanges as string[])
    : [];
  const arcPlanText = [
    arc?.premise
      ? `Premise arc (kế hoạch gốc, KHÔNG đổi):\n${arc.premise}`
      : "",
    arcExpectedChanges.length > 0
      ? `Expected changes (nên xảy ra trong arc):\n${arcExpectedChanges.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
      : "",
    arcExpectedPower.length > 0
      ? `Thay đổi cảnh giới/sức mạnh dự kiến:\n${arcExpectedPower.map((c) => `  - ${c}`).join("\n")}`
      : "",
    arcExpectedChar.length > 0
      ? `Thay đổi nhân vật dự kiến:\n${arcExpectedChar.map((c) => `  - ${c}`).join("\n")}`
      : "",
    arc?.rollingSummary
      ? `Đã xảy ra (rolling — chỉ tránh lặp):\n${arc.rollingSummary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const warm: WarmTier = {
    sagaSummary: sagaPlanText,
    arcSummary: arcPlanText,
    activeCharacters: characters,
    arcOpenThreads: threads,
    arcPlantedSeeds: arcSeeds,
    knownFactions,
  };

  const goalText = packet.goal;
  let retrievedFacts: CanonFactCompact[] = [];
  try {
    const embResp = await embeddingService.embed({
      input: goalText,
      traceId,
    });
    retrievedFacts = await getTopKCanonFacts(
      db,
      storyId,
      embResp.vector,
      cfg.RETRIEVED_CANON_FACTS_TOP_K,
      [...cfg.RETRIEVAL_MIN_IMPORTANCE],
    );
  } catch (err) {
    log?.warn(
      { err, storyId, chapterNumber },
      "embedding lookup failed, skipping canon facts",
    );
  }

  const pastChapterSummaries = await getPastChapterSummaries(
    db,
    storyId,
    chapterNumber,
    cfg.RETRIEVED_PAST_CHAPTERS_MIN_GAP,
    cfg.RETRIEVED_PAST_CHAPTERS_TOP_K,
  );

  const cold: ColdTier = {
    recentSummaries,
    retrievedFacts,
    retrievedPastChapters: pastChapterSummaries,
    seedsToPlantNow: dueSeeds,
    timelineEvents: timelineEventsRows,
    pendingCanonUpdates: pendingCanonUpdatesRows,
    packet,
  };

  const hotHash = computeHotHash(hot);
  const warmHash = computeWarmHash(warm);

  const sagaProgress = computeProgressWindow({
    chapterNumber,
    startChapter: saga?.startChapter,
    endChapter: saga?.endChapter,
    fallbackEndChapter: storyTargetChapterCount,
    fallbackSource: "story_target_fallback",
  });

  const arcProgress = computeProgressWindow({
    chapterNumber,
    startChapter: arc?.startChapter,
    endChapter: arc?.endChapter,
    fallbackEndChapter: saga?.endChapter ?? storyTargetChapterCount,
    fallbackSource:
      saga?.endChapter != null ? "saga_end_fallback" : "story_target_fallback",
  });

  const sagaPhase = progressPhaseFor(sagaProgress?.percent ?? null);
  const arcPhase = progressPhaseFor(arcProgress?.percent ?? null);

  let activeTurningPoint: string | null = null;
  if (
    saga &&
    sagaProgress &&
    Array.isArray(saga.expectedTurningPoints) &&
    (saga.expectedTurningPoints as string[]).length > 0
  ) {
    const tps = saga.expectedTurningPoints as string[];
    const sagaSpan = Math.max(
      1,
      sagaProgress.endChapter - sagaProgress.startChapter + 1,
    );
    const sagaPosition = chapterNumber - sagaProgress.startChapter + 1;
    const idx = Math.min(
      tps.length - 1,
      Math.max(0, Math.floor((sagaPosition - 1) / (sagaSpan / tps.length))),
    );
    activeTurningPoint = tps[idx] ?? null;
  }

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
      sagaProgressPercent: sagaProgress?.percent ?? null,
      arcProgressPercent: arcProgress?.percent ?? null,
      sagaProgressSource: sagaProgress?.source ?? null,
      arcProgressSource: arcProgress?.source ?? null,
      sagaRange: sagaProgress?.range ?? null,
      arcRange: arcProgress?.range ?? null,
      sagaPhase,
      arcPhase,
      activeTurningPoint,
      targetInputBudget: cfg.TOKEN_BUDGET_NORMAL,
    },
  };

  ctx = shrinkToFit(ctx, cfg.TOKEN_BUDGET_NORMAL);

  return ctx;
}

function buildHotTier(
  bible: {
    worldRules: string;
    forbiddenRules: string;
    styleGuide: string;
    powerSystem?: string | null;
    powerSystemKind?: string | null;
    cultivationSystem?: string | null;
    bloodlineSystem?: string | null;
    compactSummary: string | null;
    styleFewShots: StyleFewShot[] | string[];
  } | null,
  domain: {
    genreDef: GenreDef;
    personalityDef: PersonalityDef;
    storyOptions: StoryOptions;
  },
  cfg: ContextConfig,
): HotTier {
  if (!bible) {
    return {
      systemRules: "",
      bibleCompact: "",
      styleGuide: "",
      powerSystem: "",
      powerSystemKind: "none",
      styleFewShots: [],
      genreContract: renderGenreContract(domain.genreDef, domain.storyOptions),
      personalityContract: renderPersonalityContract(domain.personalityDef),
      storyOptionsBlock: buildStoryOptionsBlock({
        storyOptions: domain.storyOptions,
        target: "writer",
      }),
    };
  }

  const fewShots: StyleFewShot[] = Array.isArray(bible.styleFewShots)
    ? bible.styleFewShots.map((s) =>
        typeof s === "string" ? { excerpt: s } : s,
      )
    : [];

  const powerSystemText =
    bible.powerSystem ??
    [bible.cultivationSystem, bible.bloodlineSystem]
      .filter(Boolean)
      .join("\n\n");

  return {
    systemRules: `${bible.worldRules}\n\n# QUY TẮC CẤM\n${bible.forbiddenRules}`,
    bibleCompact: bible.compactSummary ?? "",
    styleGuide: bible.styleGuide,
    powerSystem: powerSystemText,
    powerSystemKind: bible.powerSystemKind ?? "none",
    styleFewShots: fewShots.slice(0, cfg.STYLE_FEWSHOT_COUNT),
    genreContract: renderGenreContract(domain.genreDef, domain.storyOptions),
    personalityContract: renderPersonalityContract(domain.personalityDef),
    storyOptionsBlock: buildStoryOptionsBlock({
      storyOptions: domain.storyOptions,
      target: "writer",
    }),
  };
}

function filterArcSeeds(
  seeds: SeedCompact[],
  chapterNumber: number,
): SeedCompact[] {
  return seeds.filter(
    (s) =>
      s.status !== "abandoned" &&
      s.status !== "paid_off" &&
      s.plantWindowStart <= chapterNumber,
  );
}
