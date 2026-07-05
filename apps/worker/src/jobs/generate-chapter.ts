import { eq, and } from "drizzle-orm";
import {
  chapters,
  chapterPackets,
  chapterSummaries,
  contextPackets,
  plantedSeeds,
  validations,
  sagas,
  arcs,
} from "@novel/db/schema";
import type { Db } from "@novel/db";
import type { Logger } from "pino";
import {
  PacketGenerator,
  type PacketGenerationResult,
  WriterAgent,
  type WriterResult,
  decideChapterGenerationMode,
  LlmValidatorAgent,
  AutoFixerAgent,
  PolishPassAgent,
  SlotStructureAgent,
  SlotCharacterAgent,
  SlotSceneAgent,
  SlotSynthesisAgent,
  findAntiLlmPatternHits,
  CanonExtractor,
  type CanonExtractionResult,
  type ExtractorOutput,
  SummaryCompactor,
  extractTailContent,
  auditPacket,
  buildChecks,
  runDeterministicValidator,
  type DeterministicValidatorResult,
  buildContext,
  computeProgressWindow,
  computeTurningPointStatuses,
  type ChapterContext,
  type CheckInput,
  CanonMerger,
  type CanonMergerMode,
  type CanonMergerRow,
  type CanonSnapshot,
  getStoryBible,
  getArcById,
  getArcForChapter,
  getSagaForChapter,
  getActiveCharacters,
  getOpenThreadsForStory,
  getSeedsDueForChapter,
  isThreadOverdue,
  getRecentSummaries,
  getStoryTargetChapterCount,
  getLockedCanonFactCandidates,
  getSeedsApproachingPlantDeadline,
  type EmbeddingService,
  OpenRouterEmbeddingService,
  formatValidationReport,
  loadStoryDomainContext,
  type StoryDomainContext,
} from "@novel/ai";
import { verifyDeterministicFindings } from "@novel/ai/validators/deterministic/verifier";
import {
  parseRealmLadder,
  DEFAULT_REALM_LADDER,
} from "@novel/ai/utils/realm-order";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenAICompatibleProvider } from "@novel/ai/providers/openai-compatible";
import { OllamaProvider } from "@novel/ai/providers/ollama";
import { OpenRouterProvider } from "@novel/ai/providers/openrouter";
import { VmlxProvider } from "@novel/ai/providers/vmlx";
import {
  LoggedLLMProvider,
  makeDrizzleRecorder,
  formatLlmPromptPayloadForTerminal,
  type LlmPromptLogPayload,
} from "@novel/ai/llm-call-logger";
import type { LLMProvider, CompletionUsage } from "@novel/ai/providers/types";
import {
  CONTEXT_CONFIG,
  estimateCostUsd,
  estimateTokensJson,
  modelFor,
  parseLlmProvider,
  shouldRefreshRollingSummary,
  shouldRunReviewer,
  type AgentRole,
  type EffectiveConfig,
  type EntryState,
} from "@novel/core";
import type { GenerateChapterJob } from "../queues.js";
import type { GenerateChapterJobResult } from "./generate-chapter.types.js";
import { loadEffectiveStoryConfig } from "../services/story-config.js";
import {
  enqueueRefreshArcSummary,
  enqueueHighStakesReview,
} from "../services/queue-publisher.js";
import { incrementMetric, METRIC_NAMES } from "../services/metrics.js";

export interface GenerateChapterDeps {
  db: Db;
  provider: LLMProvider;
  embeddingService: EmbeddingService;
  logger: Logger;
  mode: "safe" | "semi_auto" | "full_auto";
  effectiveConfig?: EffectiveConfig;
}

/** §1.8 escalation: a packet that still fails audit after retries must not be written unattended. */
export function shouldPauseOnAuditFailure(mode: string, requiresRegenerate: boolean): boolean {
  return requiresRegenerate && mode !== "safe";
}

export function shouldPauseOnHighValidatorIssue(
  mode: string,
  hasHighValidatorIssue: boolean,
): boolean {
  return hasHighValidatorIssue && mode !== "full_auto";
}

export function validationStatusForDeterministicResult(
  checks: Array<{ pass: boolean; severity: string }>,
): "passed" | "failed" {
  return checks.some(
    (check) =>
      !check.pass &&
      (check.severity === "high" || check.severity === "critical"),
  )
    ? "failed"
    : "passed";
}

function buildFallbackChapterSummary(title: string, content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  const excerpt =
    normalized.length > 1200 ? `${normalized.slice(0, 1199).trimEnd()}…` : normalized;
  return [`${title}:`, excerpt].filter(Boolean).join(" ").trim();
}

function buildEmptyExtractionResult(): CanonExtractionResult {
  const output: ExtractorOutput = {
    characterUpdates: [],
    newCanonFacts: [],
    threadUpdates: [],
    newTimelineEvents: [],
    factionUpdates: [],
    seedsResolvedThisChapter: [],
    turningPointsCompleted: [],
    arcChangesCompleted: [],
  };
  return {
    output,
    promptVersion: "fallback-empty",
    rawContent: "",
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
  };
}

export function serializeContextForWriter(
  ctx: ChapterContext,
  opts?: { realmLadder?: readonly string[] },
): string {
  const parts: string[] = [];

  if (ctx.hot.systemRules) parts.push(`# SYSTEM RULES\n${ctx.hot.systemRules}`);
  if (ctx.hot.bibleCompact)
    parts.push(`# BIBLE COMPACT\n${ctx.hot.bibleCompact}`);
  if (ctx.hot.styleGuide) parts.push(`# STYLE GUIDE\n${ctx.hot.styleGuide}`);
  if (ctx.hot.powerSystem) parts.push(`# POWER RULES\n${ctx.hot.powerSystem}`);

  // Inject structured power progression ladder so the LLM knows exact order
  if (opts?.realmLadder && opts.realmLadder.length > 0) {
    parts.push(
      `# POWER PROGRESSION (thấp → cao)\n${opts.realmLadder.join(" → ")}`,
    );
  }

  for (const shot of ctx.hot.styleFewShots) {
    parts.push(`# STYLE EXAMPLE\n${shot.excerpt}`);
  }

  if (ctx.hot.genreContract) parts.push(ctx.hot.genreContract);
  if (ctx.hot.personalityContract) parts.push(ctx.hot.personalityContract);
  if (ctx.hot.storyOptionsBlock) parts.push(ctx.hot.storyOptionsBlock);

  const progressLines: string[] = [];
  if (ctx.meta.sagaProgressPercent != null) {
    const range = ctx.meta.sagaRange ? ` (chapter ${ctx.meta.sagaRange})` : "";
    const phase = ctx.meta.sagaPhase ? `, phase=${ctx.meta.sagaPhase}` : "";
    const source = ctx.meta.sagaProgressSource
      ? `, source=${ctx.meta.sagaProgressSource}`
      : "";
    progressLines.push(
      `Saga: ${ctx.meta.sagaProgressPercent}%${range}${phase}${source}`,
    );
  }
  if (ctx.meta.arcProgressPercent != null) {
    const range = ctx.meta.arcRange ? ` (chapter ${ctx.meta.arcRange})` : "";
    const phase = ctx.meta.arcPhase ? `, phase=${ctx.meta.arcPhase}` : "";
    const source = ctx.meta.arcProgressSource
      ? `, source=${ctx.meta.arcProgressSource}`
      : "";
    progressLines.push(
      `Arc: ${ctx.meta.arcProgressPercent}%${range}${phase}${source}`,
    );
  }
  if (ctx.meta.activeTurningPoint) {
    progressLines.push(`Active turning point: ${ctx.meta.activeTurningPoint}`);
  }
  if (progressLines.length > 0) {
    parts.push(`# STORY PROGRESS\n${progressLines.join("\n")}`);
  }

  if (ctx.warm.sagaSummary)
    parts.push(`# SAGA SUMMARY\n${ctx.warm.sagaSummary}`);
  if (ctx.warm.arcSummary) parts.push(`# ARC SUMMARY\n${ctx.warm.arcSummary}`);
  if (ctx.warm.activeCharacters.length > 0) {
    const chars = ctx.warm.activeCharacters
      .map((c) => {
        let line = `- ${c.name} [${c.status}] realm=${c.currentRealm ?? "-"} faction=${c.faction ?? "-"}`;
        if (c.shortTraits.length > 0)
          line += ` traits=[${c.shortTraits.join(", ")}]`;
        if (c.bloodlines.length > 0)
          line += ` bloodlines=[${c.bloodlines.join(", ")}]`;
        return line;
      })
      .join("\n");
    parts.push(`# ACTIVE CHARACTERS\n${chars}`);
  }
  if (ctx.warm.arcOpenThreads.length > 0) {
    const threads = ctx.warm.arcOpenThreads
      .map((t) => {
        const deadline = t.plannedResolutionChapter
          ? ` → resolve by ch${t.plannedResolutionChapter}`
          : "";
        return `- ${t.title} [${t.state}] (from ch${t.introducedChapter})${deadline}`;
      })
      .join("\n");
    parts.push(`# OPEN THREADS\n${threads}`);
  }
  if (ctx.warm.arcPlantedSeeds.length > 0) {
    const seeds = ctx.warm.arcPlantedSeeds
      .map((s) => `- "${s.seedText}" → ${s.payoffDescription} [${s.status}]`)
      .join("\n");
    parts.push(`# PLANTED SEEDS\n${seeds}`);
  }

  if (ctx.warm.parallelThreads && ctx.warm.parallelThreads.length > 0) {
    const parallelThreads = ctx.warm.parallelThreads
      .filter((thread) => thread.startChapter <= ctx.meta.chapterNumber)
      .map((thread) => {
        const closed = thread.endChapter < ctx.meta.chapterNumber ? "closed" : "active";
        return `- ${thread.id} [${closed}] ch${thread.startChapter}-ch${thread.endChapter}: ${thread.premise}`;
      })
      .join("\n");
    if (parallelThreads) parts.push(`# PARALLEL THREADS\n${parallelThreads}`);
  }

  if (ctx.warm.knownFactions && ctx.warm.knownFactions.length > 0) {
    const factionLines = ctx.warm.knownFactions
      .map((f) => `- ${f.name} [${f.status}]${f.type ? ` type=${f.type}` : ""}`)
      .join("\n");
    parts.push(`# KNOWN FACTIONS\n${factionLines}`);
  }

  if (ctx.cold.recentSummaries.length > 0) {
    const sums = ctx.cold.recentSummaries
      .map((s) => `- Ch${s.chapterNumber}: ${s.summary}`)
      .join("\n");
    parts.push(`# RECENT SUMMARIES\n${sums}`);
  }
  if (ctx.cold.retrievedFacts.length > 0) {
    const facts = ctx.cold.retrievedFacts
      .map((f) => `- [${f.importance}] ${f.fact}`)
      .join("\n");
    parts.push(`# CANON FACTS\n${facts}`);
  }
  if (ctx.cold.retrievedPastChapters.length > 0) {
    const past = ctx.cold.retrievedPastChapters
      .map((s) => `- Ch${s.chapterNumber}: ${s.summary}`)
      .join("\n");
    parts.push(`# PAST CHAPTER SUMMARIES\n${past}`);
  }
  if (ctx.cold.seedsToPlantNow.length > 0) {
    const due = ctx.cold.seedsToPlantNow
      .map(
        (s) =>
          `- Nên plant trong chương này: "${s.seedText}" (id=${s.id}) → ${s.payoffDescription} — cửa sổ kết thúc ch${s.plantWindowEnd}`,
      )
      .join("\n");
    parts.push(`# SEEDS DUE THIS CHAPTER\n${due}`);
  }

  if (ctx.cold.timelineEvents && ctx.cold.timelineEvents.length > 0) {
    const events = ctx.cold.timelineEvents
      .map((e) => `- Ch${e.chapterNumber} [${e.importance}] ${e.eventText}`)
      .join("\n");
    parts.push(`# TIMELINE EVENTS\n${events}`);
  }

  if (ctx.cold.pendingCanonUpdates && ctx.cold.pendingCanonUpdates.length > 0) {
    const pending = ctx.cold.pendingCanonUpdates
      .map((p) => {
        const conflict =
          p.conflictStatus !== "none" ? ` \u26A0 ${p.conflictStatus}` : "";
        return `- [${p.updateType} ${p.targetTable}]${conflict} ${p.summary}`;
      })
      .join("\n");
    parts.push(
      `# PENDING CANON UPDATES (ch\u01B0a apply \u2014 KH\u00D4NG d\u1EF1a v\u00E0o \u0111\u1EC3 vi\u1EBFt)\n${pending}`,
    );
  }

  if (ctx.cold.packet) {
    const p = ctx.cold.packet;
    parts.push(`# CHAPTER PLAN (packet)`);
    parts.push(`Goal: ${p.goal}`);
    parts.push(`Conflict: ${p.conflict}`);
    parts.push(`Cliffhanger: ${p.cliffhanger}`);
    parts.push(`Characters present: ${p.charactersPresent.join(", ")}`);
    if (p.requiredEvents.length > 0)
      parts.push(
        `Required events (nên xảy ra trong chương này):\n${p.requiredEvents.map((e, i) => `  ${i + 1}. ${e.description}`).join("\n")}`,
      );
    if (p.forbiddenMoves.length > 0)
      parts.push(`Forbidden: ${p.forbiddenMoves.join("; ")}`);
  }

  return parts.join("\n\n");
}

/**
 * Resolve the realm ladder for a story bible with fallback cascade:
 * 1. bible.realmLadder (structured, from LLM at bible-gen time)
 * 2. parseRealmLadder(bible.cultivationSystem) (heuristic parse of free-form text)
 * 3. DEFAULT_REALM_LADDER only if genreFamily === 'cultivation' (backward-compat)
 * 4. [] (empty) for non-cultivation stories without a ladder
 */
function resolveRealmLadder(
  bible: { realmLadder?: string[] | null; cultivationSystem?: string | null },
  genreFamily: string,
): string[] {
  if (bible.realmLadder && bible.realmLadder.length > 0) {
    return bible.realmLadder;
  }
  const parsed = parseRealmLadder(bible.cultivationSystem);
  if (parsed.length > 0) return parsed;
  // Only use the hardcoded default for cultivation stories (backward-compat)
  if (genreFamily === "cultivation") return [...DEFAULT_REALM_LADDER];
  return [];
}

function buildConsistentChronology(ctx: ChapterContext): string[] {
  const lines: string[] = [];

  if (ctx.meta.sagaProgressPercent != null) {
    lines.push(`Saga progress ${ctx.meta.sagaProgressPercent}%`);
  }
  if (ctx.meta.arcProgressPercent != null) {
    lines.push(`Arc progress ${ctx.meta.arcProgressPercent}%`);
  }
  if (ctx.meta.activeTurningPoint) {
    lines.push(`Active turning point: ${ctx.meta.activeTurningPoint}`);
  }
  if (ctx.cold.recentSummaries[0]) {
    lines.push(
      `Most recent prior chapter summary: Ch${ctx.cold.recentSummaries[0].chapterNumber} ${ctx.cold.recentSummaries[0].summary}`,
    );
  }
  if (ctx.cold.timelineEvents[0]) {
    lines.push(
      `Latest timeline event anchor: Ch${ctx.cold.timelineEvents[0].chapterNumber} ${ctx.cold.timelineEvents[0].eventText}`,
    );
  }

  return lines;
}

function buildEmotionalArc(entryState?: EntryState): string[] {
  if (!entryState) return [];

  const lines: string[] = [];
  if (entryState.povCharacter.emotionalState) {
    lines.push(`Start from emotional state: ${entryState.povCharacter.emotionalState}`);
  }
  if (entryState.povCharacter.immediateGoal) {
    lines.push(`Tie emotion to immediate goal: ${entryState.povCharacter.immediateGoal}`);
  }
  if (entryState.povCharacter.physicalCondition) {
    lines.push(`Reflect physical condition in emotion: ${entryState.povCharacter.physicalCondition}`);
  }
  return lines;
}

function buildCanonSnapshotFromContext(
  ctx: ChapterContext,
  realmLadder?: string[],
): CanonSnapshot {
  return {
    characters: ctx.warm.activeCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      currentRealm: c.currentRealm,
      status: c.status,
      currentBloodlines: c.bloodlines,
      faction: c.faction,
      lockedFields: [],
    })),
    canonFacts: ctx.cold.retrievedFacts.map((f) => ({
      id: f.id,
      fact: f.fact,
      importance: f.importance,
      locked: f.importance === "locked",
    })),
    threads: ctx.warm.arcOpenThreads.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.state,
    })),
    factions: (ctx.warm.knownFactions ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      type: f.type,
      // Lock status of terminal factions so canon-merger refuses accidental revives.
      lockedFields:
        f.status === "destroyed" || f.status === "absorbed" ? ["status"] : [],
    })),
    realmLadder,
  };
}

function buildCanonSnapshotText(snapshot: CanonSnapshot): string {
  const parts: string[] = [];
  if (snapshot.characters.length > 0) {
    const chars = snapshot.characters
      .map(
        (c) =>
          `- ${c.name} [${c.status}] realm=${c.currentRealm ?? "-"} bloodlines=${c.currentBloodlines.join(",")} locked=${c.lockedFields.join(",")}`,
      )
      .join("\n");
    parts.push(`## Characters\n${chars}`);
  }
  if (snapshot.canonFacts.length > 0) {
    const facts = snapshot.canonFacts
      .map((f) => `- [${f.importance}${f.locked ? "/LOCKED" : ""}] ${f.fact}`)
      .join("\n");
    parts.push(`## Canon Facts\n${facts}`);
  }
  if (snapshot.threads.length > 0) {
    const threads = snapshot.threads
      .map((t) => `- ${t.title} [${t.status}]`)
      .join("\n");
    parts.push(`## Threads\n${threads}`);
  }
  if (snapshot.factions && snapshot.factions.length > 0) {
    const factionLines = snapshot.factions
      .map(
        (f) =>
          `- ${f.name} [${f.status}]${f.type ? ` type=${f.type}` : ""}${f.lockedFields.length > 0 ? ` locked=${f.lockedFields.join(",")}` : ""}`,
      )
      .join("\n");
    parts.push(`## Factions\n${factionLines}`);
  }
  return parts.join("\n\n");
}

function buildCheckCanon(ctx: ChapterContext): CheckInput["canon"] {
  return {
    deadCharacterNames: ctx.warm.activeCharacters
      .filter((c) => c.status === "dead")
      .map((c) => c.name),
    knownCharacterNames: ctx.warm.activeCharacters.map((c) => c.name),
    knownLocationNames: [],
    knownBloodlineNames: ctx.warm.activeCharacters
      .flatMap((c) => c.bloodlines)
      .filter((v, i, a) => a.indexOf(v) === i),
    knownFactionNames: (ctx.warm.knownFactions ?? [])
      // Suppress destroyed factions so the unknown-faction check still complains
      // if the writer accidentally resurrects a wiped sect.
      .filter((f) => f.status !== "destroyed")
      .map((f) => f.name),
    lockedFacts: ctx.cold.retrievedFacts
      .filter((f) => f.importance === "locked")
      .map((f) => ({ topic: f.topic, fact: f.fact })),
    realmByCharacter: Object.fromEntries(
      ctx.warm.activeCharacters
        .filter((c) => c.currentRealm)
        .map((c) => [c.name, c.currentRealm]),
    ),
  };
}

function extractorOutputToRows(
  extracted: CanonExtractionResult["output"],
): CanonMergerRow[] {
  const rows: CanonMergerRow[] = [];

  for (const cu of extracted.characterUpdates) {
    const fields: Record<string, unknown> = { ...cu.fields };
    if (cu.action === "update" && cu.targetId) {
      rows.push({
        updateType: cu.action,
        targetTable: "characters",
        targetId: cu.targetId,
        payload: { name: cu.name, fields },
      });
    } else if (cu.action === "create") {
      rows.push({
        updateType: cu.action,
        targetTable: "characters",
        targetId: null,
        payload: { name: cu.name, ...cu.fields },
      });
    }
  }

  for (const cf of extracted.newCanonFacts) {
    rows.push({
      updateType: "create",
      targetTable: "canon_facts",
      targetId: null,
      payload: { topic: cf.topic, fact: cf.fact, importance: cf.importance },
    });
  }

  for (const tu of extracted.threadUpdates) {
    rows.push({
      updateType: tu.action,
      targetTable: "open_threads",
      targetId: tu.targetId ?? null,
      payload: {
        title: tu.title,
        state: tu.state,
        plannedResolutionChapter: tu.plannedResolutionChapter,
      },
    });
  }

  for (const te of extracted.newTimelineEvents) {
    rows.push({
      updateType: "create",
      targetTable: "timeline_events",
      targetId: null,
      payload: {
        description: te.description,
        charactersInvolved: te.charactersInvolved,
        significance: te.significance,
      },
    });
  }

  for (const fu of extracted.factionUpdates) {
    if (fu.action === "update" && fu.targetId) {
      rows.push({
        updateType: fu.action,
        targetTable: "factions",
        targetId: fu.targetId,
        payload: { name: fu.name, fields: fu.fields },
      });
    } else if (fu.action === "create") {
      // Mirrors the character-create payload shape so applyRow / pending-updates
      // can read top-level fields directly.
      rows.push({
        updateType: fu.action,
        targetTable: "factions",
        targetId: null,
        payload: { name: fu.name, ...fu.fields },
      });
    }
  }

  return rows;
}

function accumulateUsage(
  usage: CompletionUsage,
  acc: { inputTokens: number; outputTokens: number; cachedInputTokens: number },
): void {
  acc.inputTokens += usage.inputTokens;
  acc.outputTokens += usage.outputTokens;
  acc.cachedInputTokens += usage.cachedInputTokens;
}

function modelForRole(
  config: EffectiveConfig | undefined,
  role: AgentRole,
): string {
  return config?.model.routes[role] ?? modelFor(role);
}

function isFirstChapterOfArc(
  arc: { startChapter?: number | null } | null | undefined,
  chapterNumber: number,
): boolean {
  return arc?.startChapter != null && arc.startChapter === chapterNumber;
}

function isLastChapterOfArc(
  arc: { endChapter?: number | null } | null | undefined,
  chapterNumber: number,
): boolean {
  return arc?.endChapter != null && arc.endChapter === chapterNumber;
}

function buildPolishHints(content: string): string[] {
  return findAntiLlmPatternHits(content).map((hit) => hit.message);
}

function buildSlotSerializedContext(
  serializedContext: string,
  packet: PacketGenerationResult["packet"],
  chapterNumber: number,
): string {
  return `${serializedContext}\n\n# SLOT PIPELINE BRIEF\nChương ${chapterNumber} phải bám sát cấu trúc slot-based.\nGoal: ${packet.goal}\nConflict: ${packet.conflict}\nCliffhanger: ${packet.cliffhanger}`;
}

function buildWorkerProvider(data: GenerateChapterJob): LLMProvider {
  const provider =
    data.llmProvider ?? parseLlmProvider(process.env.NOVEL_LLM_PROVIDER);
  if (provider === "openrouter") {
    return new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseUrl: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    });
  }

  if (provider === "ollama") {
    return new OllamaProvider({
      apiKey: process.env.OLLAMA_API_KEY,
      baseUrl: process.env.OLLAMA_BASE_URL,
    });
  }

  if (provider === "vmlx") {
    return new VmlxProvider({
      baseUrl: process.env.VMLX_BASE_URL,
    });
  }

  return new OpenAICompatibleProvider({
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY ?? "",
    baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "",
  });
}

async function writeValidationLog(
  input: {
    storyId: string;
    chapterNumber: number;
    chapterTitle?: string;
    wordCount?: number;
    deterministicResult?: DeterministicValidatorResult;
    llmResult?: import("@novel/ai").LlmValidatorOutput;
  },
  logger: Logger,
): Promise<string | undefined> {
  const report = formatValidationReport({
    ...input,
    timestamp: new Date(),
  });

  const logDir =
    process.env.VALIDATION_LOG_DIR ??
    join(process.cwd(), "logs", "validations");
  const dir = join(logDir, input.storyId);
  await mkdir(dir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `chapter-${input.chapterNumber}-${ts}.txt`;
  const filePath = join(dir, fileName);

  await writeFile(filePath, report, "utf-8");
  logger.info({ filePath }, "validation report written to text file");
  return filePath;
}

export async function persistContextPacket(
  db: Db,
  packet: {
    chapterId: string;
    hotTierHash: string;
    warmTierHash: string;
    coldPayload: Record<string, unknown>;
    totalInputTokens: number;
    cachedInputTokens: number;
    configSnapshot?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(contextPackets).values(packet);
}

export async function persistValidationRows(
  db: Db,
  input: {
    storyId: string;
    chapterId: string;
    checks: {
      id: string;
      severity: "low" | "medium" | "high" | "critical";
      pass: boolean;
      issues: string[];
    }[];
    validatorModel: string;
  },
): Promise<void> {
  if (input.checks.length === 0) return;
  await db.insert(validations).values(
    input.checks.map((check) => ({
      storyId: input.storyId,
      chapterId: input.chapterId,
      pass: check.pass,
      severity: check.severity,
      issues: check.issues,
      requiredFixes: check.pass ? [] : check.issues,
      validatorModel: input.validatorModel,
    })),
  );
}

export async function executeGenerateChapterPipeline(
  data: GenerateChapterJob,
  deps: GenerateChapterDeps,
): Promise<GenerateChapterJobResult> {
  const { db, provider, embeddingService, logger } = deps;
  const mode = data.mode ?? "safe";
  const effectiveConfig = deps.effectiveConfig;
  const traceId = data.traceId;
  const start = Date.now();
  const tokenAcc = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let totalCost = 0;

  const log = logger.child({
    traceId,
    storyId: data.storyId,
    chapterNumber: data.chapterNumber,
    agent: "generate_chapter",
  });

  log.info({ mode }, "starting generate-chapter pipeline");

  const recordParseRecovery = (event: { strategy: "strip_fences" | "extract_object" | "re_prompt"; detail: string }) => {
    incrementMetric(METRIC_NAMES.parseRecoveryTotal);
    log.info(
      { metric: METRIC_NAMES.parseRecoveryTotal, strategy: event.strategy, detail: event.detail },
      "worker metric incremented",
    );
  };

  const arc = data.arcId
    ? await getArcById(db, data.arcId)
    : await getArcForChapter(db, data.storyId, data.chapterNumber);
  const resolvedArcId = arc?.id;

  if (!resolvedArcId) {
    throw new Error(
      `No arc found for story ${data.storyId} chapter ${data.chapterNumber}`,
    );
  }

  const [existing] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.storyId, data.storyId),
        eq(chapters.chapterNumber, data.chapterNumber),
      ),
    )
    .limit(1);

  let chapterId: string;

  if (existing) {
    if (existing.status === "completed") {
      log.info(
        { chapterId: existing.id },
        "chapter already completed, skipping",
      );
      return {
        chapterId: existing.id,
        status: "completed",
        attempts: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        durationMs: Date.now() - start,
      };
    }
    chapterId = existing.id;
    await db
      .update(chapters)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  } else {
    const [inserted] = await db
      .insert(chapters)
      .values({
        storyId: data.storyId,
        arcId: resolvedArcId,
        chapterNumber: data.chapterNumber,
        status: "generating",
      })
      .returning({ id: chapters.id });
    chapterId = inserted!.id;
  }
  await db.delete(validations).where(eq(validations.chapterId, chapterId));

  const domain = await loadStoryDomainContext(db, data.storyId);

  try {
    const bible = await getStoryBible(db, data.storyId);
    const activeCharacters = await getActiveCharacters(
      db,
      data.storyId,
      data.chapterNumber,
    );
    const openThreads = await getOpenThreadsForStory(db, data.storyId);
    const dueSeeds = await getSeedsDueForChapter(
      db,
      data.storyId,
      data.chapterNumber,
    );
    const mustIncludeSeeds = await getSeedsApproachingPlantDeadline(
      db,
      data.storyId,
      data.chapterNumber,
    );
    const recentSummaries = await getRecentSummaries(
      db,
      data.storyId,
      data.chapterNumber,
      CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT,
    );

    if (!bible)
      throw new Error(`No story bible found for story ${data.storyId}`);

    const overdueThreads = openThreads.filter((t) =>
      isThreadOverdue(t, data.chapterNumber),
    );

    const [saga, storyTargetChapterCount] = await Promise.all([
      getSagaForChapter(db, data.storyId, data.chapterNumber),
      getStoryTargetChapterCount(db, data.storyId),
    ]);

    const arcProgress = computeProgressWindow({
      chapterNumber: data.chapterNumber,
      startChapter: arc?.startChapter,
      endChapter: arc?.endChapter,
      fallbackEndChapter: saga?.endChapter ?? storyTargetChapterCount,
      fallbackSource:
        saga?.endChapter != null
          ? "saga_end_fallback"
          : "story_target_fallback",
    });
    const chaptersRemainingInArc = arcProgress
      ? Math.max(0, arcProgress.endChapter - data.chapterNumber)
      : 0;

    let pacingHint = "";
    if (arcProgress) {
      const urgency =
        arcProgress.percent >= 80
          ? `Chỉ còn ${chaptersRemainingInArc} chương trong arc — nên đẩy plot về phía climax, tránh filler hoặc kéo dài không cần thiết.`
          : arcProgress.percent >= 50
            ? `Đã qua nửa arc — mỗi chương nên có tiến triển rõ rệt về nhân vật hoặc resolve ít nhất 1 thread.`
            : `Giai đoạn xây dựng arc — mỗi chương nên đẩy ít nhất 1 thread tiến lên.`;
      pacingHint = `\n\n# PACING (arc ${arcProgress.range} ≈ ${arcProgress.percent}%, source=${arcProgress.source})\n${urgency}`;
    }

    const sagaProgress = computeProgressWindow({
      chapterNumber: data.chapterNumber,
      startChapter: saga?.startChapter,
      endChapter: saga?.endChapter,
      fallbackEndChapter: storyTargetChapterCount,
      fallbackSource: "story_target_fallback",
    });

    let tpStatuses: ReturnType<typeof computeTurningPointStatuses> = [];
    if (
      sagaProgress &&
      Array.isArray(saga?.expectedTurningPoints) &&
      saga.expectedTurningPoints.length > 0
    ) {
      const sagaSpan = Math.max(
        1,
        sagaProgress.endChapter - sagaProgress.startChapter + 1,
      );
      const sagaPosition = data.chapterNumber - sagaProgress.startChapter + 1;
      const tps = saga.expectedTurningPoints as string[];
      tpStatuses = computeTurningPointStatuses({
        turningPoints: tps,
        completedIndices: (saga.completedTurningPoints as number[]) ?? [],
        sagaPosition,
        sagaSpan,
      });
      const markerFor = {
        done: "[đã xảy ra]",
        overdue: "[trễ tiến độ]",
        current: "[đang diễn ra]",
        upcoming: "[sắp tới]",
      } as const;
      const tpList = tpStatuses
        .map((s) => `${s.index + 1}. ${markerFor[s.state]} ${s.text}`)
        .join("\n");
      pacingHint += `\n\n# SAGA PACING (saga ${sagaProgress.range} ≈ ${sagaProgress.percent}%, source=${sagaProgress.source})
Đối chiếu với # 5 CHƯƠNG GẦN NHẤT: nếu turning point được đánh dấu [trễ tiến độ] mà chưa thấy trong các chương đó, chương này nên đẩy nó xảy ra để truyện bắt kịp nhịp saga.
Turning points của saga:
${tpList}`;

      const overdueTps = tpStatuses
        .filter((s) => s.state === "overdue")
        .map((s) => s.text);
      if (overdueTps.length > 0) {
        const currentRealms = activeCharacters
          .filter((c) => c.status === "alive" && c.currentRealm)
          .map((c) => `${c.name}: ${c.currentRealm}`)
          .join(", ");
        pacingHint += `\n\n# TIẾN ĐỘ NHÂN VẬT
Các turning point sau đang trễ tiến độ — đối chiếu với cảnh giới/trạng thái nhân vật hiện tại và xem xét nên advance trong chương này:
${overdueTps.map((tp) => `  - ${tp}`).join("\n")}
Trạng thái hiện tại: ${currentRealms || "(chưa xác định)"}`;
      }
    }

    const arcExpectedChanges = Array.isArray(arc?.expectedChanges)
      ? (arc.expectedChanges as string[])
      : [];
    const arcPlanText = [
      arc?.premise ? `Premise (kế hoạch gốc, KHÔNG đổi):\n${arc.premise}` : "",
      arcExpectedChanges.length > 0
        ? `Expected changes (nên xảy ra trong arc):\n${arcExpectedChanges.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
        : "",
      arc?.rollingSummary
        ? `Đã xảy ra (rolling — chỉ dùng để tránh lặp, KHÔNG phải mục tiêu):\n${arc.rollingSummary}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const completedChangeIdx = new Set((arc?.completedChanges as number[]) ?? []);
    const unfinishedChanges = arcExpectedChanges
      .map((text, index) => ({ text, index }))
      .filter((c) => !completedChangeIdx.has(c.index));
    let mandatoryChangesHint = "";
    if (arcProgress && arcProgress.percent >= 80 && unfinishedChanges.length > 0) {
      mandatoryChangesHint = `\n\n# EXPECTED CHANGES CHƯA HOÀN THÀNH (arc sắp kết thúc — PHẢI xử lý hoặc thu xếp trước chương cuối arc)\n${unfinishedChanges.map((c) => `  - ${c.text}`).join("\n")}`;
    }

    const packetInput = {
      bibleCompact: bible.compactSummary ?? "",
      arcSummary: arcPlanText,
      recentChapterSummaries: recentSummaries.map((s) => ({
        chapterNumber: s.chapterNumber,
        summary: s.summary,
      })),
      activeCharacters: activeCharacters.map((c) => ({
        name: c.name,
        currentRealm: c.currentRealm,
        status: c.status,
        faction: c.faction,
      })),
      openThreads: openThreads.map((t) => ({ title: t.title, state: t.state })),
      duePlantedSeeds: dueSeeds.map((s) => ({
        id: s.id,
        seedText: s.seedText,
        payoffDescription: s.payoffDescription,
        plantWindowEnd: s.plantWindowEnd,
      })),
      mustIncludeSeeds: mustIncludeSeeds.map((s) => ({
        id: s.id,
        seedText: s.seedText,
        plantWindowEnd: s.plantWindowEnd,
      })),
      overdueThreads: overdueThreads.map((t) => ({
        title: t.title,
        introducedChapter: t.introducedChapter,
      })),
      forbiddenRules: bible.forbiddenRules,
      chapterNumber: data.chapterNumber,
      arcGoals: (arc?.mainConflict ?? arc?.premise ?? "") + pacingHint + mandatoryChangesHint,
      realmLadder: resolveRealmLadder(bible, domain.genreFamily),
    };

    const packetModel = modelForRole(effectiveConfig, "packet_generator");
    const packetGen = new PacketGenerator({
      provider,
      logger: log,
      model: packetModel,
    });
    // §1.8 — initialized inside while loop; guaranteed assigned on first iteration
    let packetResult: PacketGenerationResult = undefined!;
    let attemptCount = 0;

    const overdueTurningPoints: string[] = tpStatuses
      .filter((s) => s.state === "overdue")
      .map((s) => s.text);

    // §1.8 — two-attempt regenerate loop
    let auditResult: ReturnType<typeof auditPacket> = undefined!;
    while (attemptCount < 2) {
      packetResult = await packetGen.generate(
        {
          ...packetInput,
          genreDef: domain.genreDef,
          personalityDef: domain.personalityDef,
          storyOptions: domain.storyOptions,
        },
        {
          traceId,
          storyId: data.storyId,
          previousIssues: auditResult?.issues,
          mustIncludeSeeds,
        },
      );
      accumulateUsage(packetResult.usage, tokenAcc);
      totalCost += estimateCostUsd(packetModel, packetResult.usage);

      // §1.5 — locked fact candidates retrieved from DB using packet text
      const packetSearchText = [
        packetResult.packet.goal,
        packetResult.packet.conflict,
        ...packetResult.packet.requiredEvents.map((e) => e.description),
      ].join(" ");
      const lockedFactCandidates = await getLockedCanonFactCandidates(
        db,
        data.storyId,
        packetSearchText,
        5,
      );

      const auditInput = {
        packet: packetResult.packet,
        characters: activeCharacters.map((c) => ({
          name: c.name,
          status: c.status,
          currentRealm: c.currentRealm,
        })),
        forbiddenRules: bible.forbiddenRules,
        duePlantedSeeds: dueSeeds.map((s) => ({
          id: s.id,
          seedText: s.seedText,
          plantWindowEnd: s.plantWindowEnd,
        })),
        overdueTurningPoints,
        lockedFactCandidates,
      };

      auditResult = auditPacket(auditInput, {
        genreFamily: domain.genreFamily,
        realmLadder: resolveRealmLadder(bible, domain.genreFamily),
      });

      attemptCount++;
      if (!auditResult.requiresRegenerate) break;
      if (attemptCount < 2) {
        log.warn(
          { issues: auditResult.issues, attempt: attemptCount },
          "packet audit failed, regenerating with hints",
        );
      }
    }

    const packetHighStakes =
      (arc as { phase?: string | null } | undefined)?.phase === "climax" ||
      isFirstChapterOfArc(arc, data.chapterNumber) ||
      isLastChapterOfArc(arc, data.chapterNumber) ||
      packetResult.packet.requiredEvents.some((event) =>
        /đột phá|đột phá cảnh giới|breakthrough|character death|chết|tử trận|hi sinh/i.test(event.description),
      );

    if (auditResult.requiresRegenerate) {
      log.error(
        { issues: auditResult.issues, attemptCount },
        "packet audit failed after all retries — operator review required (safe-mode escalation)",
      );
      if (shouldPauseOnAuditFailure(mode, auditResult.requiresRegenerate)) {
        await db.insert(chapterPackets).values({
          storyId: data.storyId,
          chapterId,
          arcId: resolvedArcId,
          chapterNumber: data.chapterNumber,
          goal: packetResult.packet.goal,
          requiredEvents: packetResult.packet.requiredEvents.map(
            (e) => e.description,
          ),
          charactersInScene: packetResult.packet.charactersPresent,
          conflict: packetResult.packet.conflict,
          cliffhanger: packetResult.packet.cliffhanger,
          forbiddenMoves: packetResult.packet.forbiddenMoves,
          highStakes: packetHighStakes,
        });
        await db
          .update(chapters)
          .set({ status: "paused_pending_updates", packetAuditStatus: "failed", updatedAt: new Date() })
          .where(eq(chapters.id, chapterId));
        return {
          chapterId,
          status: "paused_pending_updates",
          attempts: attemptCount,
          totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
          totalCostUsd: totalCost,
          durationMs: Date.now() - start,
        };
      }
    }

    await db.insert(chapterPackets).values({
      storyId: data.storyId,
      chapterId,
      arcId: resolvedArcId,
      chapterNumber: data.chapterNumber,
      goal: packetResult.packet.goal,
      requiredEvents: packetResult.packet.requiredEvents.map(
        (e) => e.description,
      ),
      charactersInScene: packetResult.packet.charactersPresent,
      conflict: packetResult.packet.conflict,
      cliffhanger: packetResult.packet.cliffhanger,
      forbiddenMoves: packetResult.packet.forbiddenMoves,
      highStakes: packetHighStakes,
    });

    const chapterGenerationMode = decideChapterGenerationMode({
      packetHighStakes,
      isFirstChapterOfArc: isFirstChapterOfArc(arc, data.chapterNumber),
      isLastChapterOfArc: isLastChapterOfArc(arc, data.chapterNumber),
    });

    await db
      .update(chapters)
      .set({
        packetAuditStatus: auditResult.pass ? "passed" : "failed",
        generationMode: chapterGenerationMode,
        polishPassStatus: "skipped",
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    const context = await buildContext({
      db,
      storyId: data.storyId,
      chapterNumber: data.chapterNumber,
      arcId: resolvedArcId,
      chapterId,
      packet: packetResult.packet,
      embeddingService,
      traceId,
      logger: log,
      config: effectiveConfig?.context,
      domain,
    });

    await persistContextPacket(db, {
      chapterId,
      hotTierHash: context.meta.hotHash,
      warmTierHash: context.meta.warmHash,
      coldPayload: context.cold as unknown as Record<string, unknown>,
      totalInputTokens: estimateTokensJson(context),
      cachedInputTokens: tokenAcc.cachedInputTokens,
      configSnapshot: effectiveConfig as unknown as
        | Record<string, unknown>
        | undefined,
    });

    const serializedContext = serializeContextForWriter(context, {
      realmLadder: resolveRealmLadder(bible, domain.genreFamily),
    });

    const writerModel = modelForRole(effectiveConfig, "writer");
    let writerResult: WriterResult;
    if (chapterGenerationMode === "slot_based") {
      incrementMetric(METRIC_NAMES.slotBasedChaptersTotal);
      log.info({ metric: METRIC_NAMES.slotBasedChaptersTotal, generationMode: chapterGenerationMode }, "worker metric incremented");
      const structureAgent = new SlotStructureAgent({ provider, model: writerModel });
      const characterAgent = new SlotCharacterAgent({ provider, model: writerModel });
      const sceneAgent = new SlotSceneAgent({ provider, model: writerModel });
      const synthesisAgent = new SlotSynthesisAgent({ provider, model: writerModel });
      const structure = await structureAgent.plan({
        serializedContext,
        chapterNumber: data.chapterNumber,
      });
      const characterPlans = await characterAgent.plan({
        charactersPresent: packetResult.packet.charactersPresent,
      });
      const scenePlan = await sceneAgent.plan({
        structure,
        characterPlans,
        conflict: packetResult.packet.conflict,
        requiredEvents: packetResult.packet.requiredEvents.map((event) => event.description),
        cliffhanger: packetResult.packet.cliffhanger,
      });
      writerResult = await synthesisAgent.write({
        serializedContext: buildSlotSerializedContext(serializedContext, packetResult.packet, data.chapterNumber),
        cacheKey: context.meta.hotHash,
        chapterNumber: data.chapterNumber,
        storyId: data.storyId,
        traceId,
        genreDef: domain.genreDef,
        structure,
        characterPlans,
        scenePlan,
      });
    } else {
      const writer = new WriterAgent({
        provider,
        logger: log,
        model: writerModel,
      });
      writerResult = await writer.write({
        serializedContext,
        cacheKey: context.meta.hotHash,
        chapterNumber: data.chapterNumber,
        storyId: data.storyId,
        traceId,
        genreDef: domain.genreDef,
        consistentChronology: buildConsistentChronology(context),
        entryState: context.warm.entryState,
        chapterTailBridge: context.warm.tailContentPrev,
        emotionalArc: buildEmotionalArc(context.warm.entryState),
        parallelThreads: (context.warm.parallelThreads ?? [])
          .filter((thread) => thread.startChapter <= data.chapterNumber)
          .map((thread) => `${thread.id}: ${thread.premise} (ch${thread.startChapter}-ch${thread.endChapter})`),
      });
    }
    accumulateUsage(writerResult.usage, tokenAcc);
    totalCost += estimateCostUsd(writerModel, writerResult.usage);

    const reviewerTriggerAfterWriter = shouldRunReviewer({
      chapterNumber: data.chapterNumber,
      arcStartChapter: arc?.startChapter,
      arcEndChapter: arc?.endChapter ?? null,
      arcPhase: (arc as { phase?: string | null } | undefined)?.phase,
      worstValidatorSeverity: "none",
      packetHighStakes,
      requiredEventTexts: packetResult.packet.requiredEvents.map((event) => event.description),
    });

    if (reviewerTriggerAfterWriter.run) {
      try {
        const reviewJobId = await enqueueHighStakesReview({
          storyId: data.storyId,
          chapterId,
          chapterNumber: data.chapterNumber,
          triggerReason: reviewerTriggerAfterWriter.reason!,
          traceId: data.traceId,
          llmProvider: data.llmProvider,
          modelRoutes: data.modelRoutes,
        });
        log.info({ reviewJobId, reason: reviewerTriggerAfterWriter.reason }, "enqueued high-stakes review after writer");
      } catch (enqueueErr) {
        log.warn({ err: enqueueErr }, "failed to enqueue post-writer high-stakes review");
      }
    }

    let polishPassStatus: "skipped" | "applied" | "failed" = "skipped";

    const checkCanon = buildCheckCanon(context);
    const checkInput: CheckInput = {
      content: writerResult.content,
      context,
      chapter: { id: chapterId, chapterNumber: data.chapterNumber },
      story: { id: data.storyId },
      canon: checkCanon,
    };

    const checks = buildChecks(bible.forbiddenRules, domain.genreFamily);
    const detResult: DeterministicValidatorResult = runDeterministicValidator(
      checkInput,
      checks,
    );

    // Phase 2: LLM verification of flagged candidates (unknown_character, unknown_location, etc.)
    if (detResult.pendingVerification.length > 0) {
      const verifierModel = modelForRole(
        effectiveConfig,
        "deterministic_verifier",
      );
      const verifyResult = await verifyDeterministicFindings(
        { provider, model: verifierModel, logger: log },
        detResult.pendingVerification,
      );
      accumulateUsage(verifyResult.usage, tokenAcc);
      totalCost += estimateCostUsd(verifierModel, verifyResult.usage);

      // Merge confirmed issues back into detResult
      for (const confirmed of verifyResult.confirmed) {
        const existing = detResult.checks.find(
          (c) => c.id === confirmed.checkId,
        );
        if (existing) {
          existing.pass = false;
          existing.issues.push(confirmed.issue);
        }
        detResult.pass = false;
      }

      if (verifyResult.dismissed.length > 0) {
        log.info(
          { dismissed: verifyResult.dismissed },
          "LLM verifier dismissed false positives from deterministic checks",
        );
      }
    }

    await db
      .update(chapters)
      .set({
        deterministicValidation: detResult.checks,
        validationStatus: validationStatusForDeterministicResult(detResult.checks),
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));
    await persistValidationRows(db, {
      storyId: data.storyId,
      chapterId,
      checks: detResult.checks,
      validatorModel: "deterministic",
    });
    const deterministicFixIssues = detResult.checks
      .filter((c) => !c.pass && c.id === "word_count_target")
      .flatMap((c) => c.issues.map((message) => ({
        code: c.id,
        severity: c.severity,
        message,
      })));

    if (detResult.shortCircuited || !detResult.pass) {
      const criticalIssues = detResult.checks.filter(
        (c) => !c.pass && (c.severity === "critical" || c.severity === "high"),
      );
      if (criticalIssues.length > 0) {
        log.error(
          { criticalIssues },
          "deterministic validation had critical issues, marking chapter as failed",
        );
        try {
          const reviewJobId = await enqueueHighStakesReview({
            storyId: data.storyId,
            chapterId,
            chapterNumber: data.chapterNumber,
            triggerReason: "critical_severity",
            traceId: data.traceId,
            llmProvider: data.llmProvider,
            modelRoutes: data.modelRoutes,
          });
          log.info({ reviewJobId }, "enqueued high-stakes review for deterministic critical issues");
        } catch (enqueueErr) {
          log.warn({ err: enqueueErr }, "failed to enqueue deterministic critical-severity review");
        }
        await writeValidationLog(
          {
            storyId: data.storyId,
            chapterNumber: data.chapterNumber,
            chapterTitle: writerResult.title,
            wordCount: writerResult.content.split(/\s+/).length,
            deterministicResult: detResult,
          },
          log,
        ).catch(() => {});
        await db
          .update(chapters)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(chapters.id, chapterId));
        return {
          chapterId,
          status: "failed",
          attempts: attemptCount,
          totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
          totalCostUsd: totalCost,
          durationMs: Date.now() - start,
        };
      }
    }

    if (!detResult.shortCircuited) {
      const llmValidatorModel = modelForRole(effectiveConfig, "llm_validator");
      const llmValidator = new LlmValidatorAgent({
        provider,
        logger: log,
        model: llmValidatorModel,
        onParseRecovery: recordParseRecovery,
      });
      const llmValResult = await llmValidator.validate({
        serializedContext,
        chapterContent: writerResult.content,
        chapterTitle: writerResult.title,
        chapterNumber: data.chapterNumber,
        storyId: data.storyId,
        traceId,
        genreDef: domain.genreDef,
        personalityDef: domain.personalityDef,
        storyOptions: domain.storyOptions,
      });
      accumulateUsage(llmValResult.usage, tokenAcc);
      totalCost += estimateCostUsd(llmValidatorModel, llmValResult.usage);
      await persistValidationRows(db, {
        storyId: data.storyId,
        chapterId,
        checks: llmValResult.output.pass
          ? [{ id: "llm_validator", severity: "low", pass: true, issues: [] }]
          : llmValResult.output.issues.map((issue) => ({
              id: issue.code,
              severity: issue.severity,
              pass: false,
              issues: [issue.message],
            })),
        validatorModel: llmValidatorModel,
      });

      if (!llmValResult.output.pass) {
        const nonCriticalIssues = llmValResult.output.issues.filter(
          (i) => i.severity === "low" || i.severity === "medium",
        );
        const criticalLlmIssues = llmValResult.output.issues.filter(
          (i) => i.severity === "critical" || i.severity === "high",
        );

        await writeValidationLog(
          {
            storyId: data.storyId,
            chapterNumber: data.chapterNumber,
            chapterTitle: writerResult.title,
            wordCount: writerResult.content.split(/\s+/).length,
            deterministicResult: detResult,
            llmResult: llmValResult.output,
          },
          log,
        ).catch(() => {});

        if (criticalLlmIssues.length > 0) {
          log.warn(
            { criticalLlmIssues },
            "LLM validator found critical/high issues",
          );
          try {
            const reviewJobId = await enqueueHighStakesReview({
              storyId: data.storyId,
              chapterId,
              chapterNumber: data.chapterNumber,
              triggerReason: "critical_severity",
              traceId: data.traceId,
              llmProvider: data.llmProvider,
              modelRoutes: data.modelRoutes,
            });
            log.info({ reviewJobId }, "enqueued high-stakes review for critical validator issues");
          } catch (enqueueErr) {
            log.warn({ err: enqueueErr }, "failed to enqueue critical-severity high-stakes review");
          }
          if (shouldPauseOnHighValidatorIssue(mode, true)) {
            const pausedWordCount = writerResult.content.trim()
              ? writerResult.content.trim().split(/\s+/).length
              : 0;
            await db
              .update(chapters)
              .set({
                title: writerResult.title,
                content: writerResult.content,
                status: "paused_pending_updates",
                wordCount: pausedWordCount,
                generationMode: chapterGenerationMode,
                polishPassStatus,
                contextCacheKey: context.meta.hotHash,
                tailContent: extractTailContent(writerResult.content),
                updatedAt: new Date(),
              })
              .where(eq(chapters.id, chapterId));
            return {
              chapterId,
              status: "paused_pending_updates",
              attempts: attemptCount,
              totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
              totalCostUsd: totalCost,
              durationMs: Date.now() - start,
            };
          }

          const failedWordCount = writerResult.content.trim()
            ? writerResult.content.trim().split(/\s+/).length
            : 0;
          await db
            .update(chapters)
            .set({
              title: writerResult.title,
              content: writerResult.content,
              status: "failed",
              wordCount: failedWordCount,
              generationMode: chapterGenerationMode,
              polishPassStatus,
              contextCacheKey: context.meta.hotHash,
              tailContent: extractTailContent(writerResult.content),
              updatedAt: new Date(),
            })
            .where(eq(chapters.id, chapterId));
          return {
            chapterId,
            status: "failed",
            attempts: attemptCount,
            totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
            totalCostUsd: totalCost,
            durationMs: Date.now() - start,
          };
        }

        const antiPatternIssues = findAntiLlmPatternHits(writerResult.content).map((hit) => ({
          code: hit.code,
          severity: hit.severity,
          message: hit.message,
        }));
        if (antiPatternIssues.length > 0) {
          incrementMetric(METRIC_NAMES.antiLlmPatternHitsTotal, antiPatternIssues.length);
          log.info(
            { metric: METRIC_NAMES.antiLlmPatternHitsTotal, count: antiPatternIssues.length },
            "worker metric incremented",
          );
          await persistValidationRows(db, {
            storyId: data.storyId,
            chapterId,
            checks: antiPatternIssues.map((issue) => ({
              id: issue.code,
              severity: issue.severity,
              pass: false,
              issues: [issue.message],
            })),
            validatorModel: "anti_llm_patterns",
          });
        }

        const combinedFixIssues = [
          ...deterministicFixIssues,
          ...nonCriticalIssues,
          ...antiPatternIssues,
        ];
        if (combinedFixIssues.length > 0) {
          log.info(
            { combinedFixIssues },
            "validator or anti-LLM issues found, auto-fixing",
          );
          const autoFixerModel = modelForRole(effectiveConfig, "auto_fixer");
          const autoFixer = new AutoFixerAgent({
            provider,
            logger: log,
            model: autoFixerModel,
          });
          const fixResult = await autoFixer.fix({
            serializedContext,
            chapterContent: writerResult.content,
            chapterTitle: writerResult.title,
            chapterNumber: data.chapterNumber,
            issues: combinedFixIssues,
            storyId: data.storyId,
            traceId,
            genreDef: domain.genreDef,
          });
          accumulateUsage(fixResult.usage, tokenAcc);
          totalCost += estimateCostUsd(autoFixerModel, fixResult.usage);
          writerResult = {
            title: fixResult.title,
            content: fixResult.content,
            usage: fixResult.usage,
            cost: fixResult.cost,
          };
        }

        const polishModel = modelForRole(effectiveConfig, "polish_pass");
        const polishAgent = new PolishPassAgent({ provider, logger: log, model: polishModel });
        try {
          const polishResult = await polishAgent.polish({
            serializedContext,
            chapterContent: writerResult.content,
            chapterTitle: writerResult.title,
            chapterNumber: data.chapterNumber,
            hints: buildPolishHints(writerResult.content),
            storyId: data.storyId,
            traceId,
            genreDef: domain.genreDef,
          });
          accumulateUsage(polishResult.usage, tokenAcc);
          totalCost += estimateCostUsd(polishModel, polishResult.usage);
          writerResult = {
            ...writerResult,
            title: polishResult.title,
            content: polishResult.content,
          };
          polishPassStatus = "applied";
          incrementMetric(METRIC_NAMES.polishPassAppliedTotal);
          log.info({ metric: METRIC_NAMES.polishPassAppliedTotal }, "worker metric incremented");
        } catch (polishErr) {
          polishPassStatus = "failed";
          log.warn({ err: polishErr }, "polish pass failed, keeping publishable chapter");
        }

        await db
          .update(chapters)
          .set({ polishPassStatus, updatedAt: new Date() })
          .where(eq(chapters.id, chapterId));
      } else if (deterministicFixIssues.length > 0) {
        log.info(
          { deterministicFixIssues },
          "deterministic target word-count issues found, auto-fixing",
        );
        const autoFixerModel = modelForRole(effectiveConfig, "auto_fixer");
        const autoFixer = new AutoFixerAgent({
          provider,
          logger: log,
          model: autoFixerModel,
        });
        const fixResult = await autoFixer.fix({
          serializedContext,
          chapterContent: writerResult.content,
          chapterTitle: writerResult.title,
          chapterNumber: data.chapterNumber,
          issues: deterministicFixIssues,
          storyId: data.storyId,
          traceId,
          genreDef: domain.genreDef,
        });
        accumulateUsage(fixResult.usage, tokenAcc);
        totalCost += estimateCostUsd(autoFixerModel, fixResult.usage);
        writerResult = {
          title: fixResult.title,
          content: fixResult.content,
          usage: fixResult.usage,
          cost: fixResult.cost,
        };
      }
    }

    const canonExtractorModel = modelForRole(
      effectiveConfig,
      "canon_extractor",
    );
    const canonExtractor = new CanonExtractor({
      provider,
      logger: log,
      model: canonExtractorModel,
      onParseRecovery: recordParseRecovery,
    });
    const canonSnapshot = buildCanonSnapshotFromContext(
      context,
      resolveRealmLadder(bible, domain.genreFamily),
    );
    const canonSnapshotText = buildCanonSnapshotText(canonSnapshot);

    let extractionResult: CanonExtractionResult;
    try {
      extractionResult = await canonExtractor.extract(
        {
          chapterNumber: data.chapterNumber,
          chapterContent: writerResult.content,
          bibleCompact: context.hot.bibleCompact,
          canonSnapshot: canonSnapshotText,
          plantedSeeds: context.warm.arcPlantedSeeds.map((s) => ({
            id: s.id,
            seedText: s.seedText,
            payoffDescription: s.payoffDescription,
            status: s.status,
          })),
          recentSummary: context.cold.recentSummaries[0]?.summary ?? "",
          sagaTurningPoints: (Array.isArray(saga?.expectedTurningPoints)
            ? (saga.expectedTurningPoints as string[])
            : []
          ).map((text, index) => ({
            index,
            text,
            completed: ((saga?.completedTurningPoints as number[]) ?? []).includes(index),
          })),
          arcExpectedChanges: arcExpectedChanges.map((text, index) => ({
            index,
            text,
            completed: ((arc?.completedChanges as number[]) ?? []).includes(index),
          })),
        },
        { traceId, storyId: data.storyId },
      );
    } catch (err) {
      extractionResult = buildEmptyExtractionResult();
      log.warn({ err }, "canon extractor failed; using empty extraction result");
    }
    accumulateUsage(extractionResult.usage, tokenAcc);
    totalCost += estimateCostUsd(canonExtractorModel, extractionResult.usage);

    let completedTurningPointsUpdate: number[] | null = null;
    let completedChangesUpdate: number[] | null = null;

    const newTpDone = extractionResult.output.turningPointsCompleted.filter(
      (i) => Array.isArray(saga?.expectedTurningPoints) && i < (saga.expectedTurningPoints as string[]).length,
    );
    if (saga && newTpDone.length > 0) {
      const merged = Array.from(new Set([...((saga.completedTurningPoints as number[]) ?? []), ...newTpDone])).sort((a, b) => a - b);
      completedTurningPointsUpdate = merged;
    }
    const newChangesDone = extractionResult.output.arcChangesCompleted.filter((i) => i < arcExpectedChanges.length);
    if (arc && newChangesDone.length > 0) {
      const merged = Array.from(new Set([...((arc.completedChanges as number[]) ?? []), ...newChangesDone])).sort((a, b) => a - b);
      completedChangesUpdate = merged;
    }

    const mergerRows = extractorOutputToRows(extractionResult.output);

    const canonMerger = new CanonMerger({ db: db as any, embeddingService });
    const mergerMode: CanonMergerMode = mode === "safe" ? "review" : "auto";
    const mergerResult = await canonMerger.submit(
      {
        storyId: data.storyId,
        chapterId,
        chapterNumber: data.chapterNumber,
        rows: mergerRows,
        seedsResolvedIds: extractionResult.output.seedsResolvedThisChapter,
        mode: mergerMode,
        traceId,
      },
      canonSnapshot,
    );

    log.info(
      {
        pendingCount: mergerResult.pendingCount,
        autoApplied: mergerResult.autoAppliedCount,
        conflicts: mergerResult.conflicts.length,
      },
      "canon merger completed",
    );

    const enforcedSeedIds = packetResult.packet.seedsAutoEnforced ?? [];
    for (const seedId of enforcedSeedIds) {
      await db
        .update(plantedSeeds)
        .set({
          status: "planted",
          plantedInChapter: data.chapterNumber,
        })
        .where(
          and(
            eq(plantedSeeds.id, seedId),
            eq(plantedSeeds.storyId, data.storyId),
            eq(plantedSeeds.status, "pending"),
          ),
        );
    }

    const summaryModel = modelForRole(effectiveConfig, "summary_compactor");
    const summaryCompactor = new SummaryCompactor({
      provider,
      logger: log,
      model: summaryModel,
    });
    let chapterSummary: string;
    try {
      const summaryResult = await summaryCompactor.compact(
        {
          chapterNumber: data.chapterNumber,
          chapterContent: writerResult.content,
          previousSummary: context.cold.recentSummaries[0]?.summary ?? "",
          bibleCompact: context.hot.bibleCompact,
          genreFamily: domain.genreFamily,
        },
        { traceId, storyId: data.storyId },
      );
      accumulateUsage(summaryResult.usage, tokenAcc);
      totalCost += estimateCostUsd(summaryModel, summaryResult.usage);
      chapterSummary = summaryResult.output.summary;
    } catch (err) {
      chapterSummary = buildFallbackChapterSummary(
        writerResult.title,
        writerResult.content,
      );
      log.warn(
        { err, summaryLen: chapterSummary.length },
        "summary compactor failed; using deterministic fallback summary",
      );
    }

    try {
      const embResp = await embeddingService.embed({
        input: chapterSummary,
        traceId,
      });
      await db.insert(chapterSummaries).values({
        chapterId,
        storyId: data.storyId,
        chapterNumber: data.chapterNumber,
        summary: chapterSummary,
        embedding: embResp.vector,
      });
    } catch (embErr) {
      log.warn(
        { err: embErr },
        "failed to embed summary, inserting without embedding",
      );
      await db.insert(chapterSummaries).values({
        chapterId,
        storyId: data.storyId,
        chapterNumber: data.chapterNumber,
        summary: chapterSummary,
      });
    }

    const wordCount = writerResult.content.split(/\s+/).length;

    // §3.4 — critical conflict types always pause the chapter regardless of mode.
    const CRITICAL_CONFLICT_TYPES = new Set([
      "realm_regression",
      "dead_character_action",
      "locked_field",
    ]);
    const hasCriticalConflict = mergerResult.conflicts.some((c) =>
      CRITICAL_CONFLICT_TYPES.has(c.type),
    );
    const finalStatus: GenerateChapterJobResult["status"] =
      hasCriticalConflict ||
      (mergerMode === "review" && mergerResult.pendingCount > 0)
        ? "paused_pending_updates"
        : "completed";

    await db
      .update(chapters)
      .set({
        title: writerResult.title,
        content: writerResult.content,
        summary: chapterSummary,
        status:
          finalStatus === "paused_pending_updates"
            ? "paused_pending_updates"
            : "completed",
        wordCount,
        generationMode: chapterGenerationMode,
        polishPassStatus,
        contextCacheKey: context.meta.hotHash,
        tailContent: extractTailContent(writerResult.content),
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    if (saga && completedTurningPointsUpdate) {
      try {
        await db
          .update(sagas)
          .set({ completedTurningPoints: completedTurningPointsUpdate, updatedAt: new Date() })
          .where(eq(sagas.id, saga.id));
        log.info(
          { completedTurningPoints: completedTurningPointsUpdate },
          "saga turning-point progress updated",
        );
      } catch (err) {
        log.warn({ err }, "failed to persist saga turning-point progress; continuing");
      }
    }
    if (arc && completedChangesUpdate) {
      try {
        await db
          .update(arcs)
          .set({ completedChanges: completedChangesUpdate })
          .where(eq(arcs.id, arc.id));
        log.info(
          { completedChanges: completedChangesUpdate },
          "arc expected-change progress updated",
        );
      } catch (err) {
        log.warn({ err }, "failed to persist arc expected-change progress; continuing");
      }
    }

    if (
      (finalStatus === "completed" ||
        finalStatus === "paused_pending_updates") &&
      resolvedArcId
    ) {
      const arcRefreshDue = shouldRefreshRollingSummary({
        chapterNumber: data.chapterNumber,
        startChapter: arc?.startChapter ?? null,
        endChapter: arc?.endChapter ?? null,
        everyN: CONTEXT_CONFIG.ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS,
      });
      if (arcRefreshDue) {
        try {
          const refreshJobId = await enqueueRefreshArcSummary({
            storyId: data.storyId,
            arcId: resolvedArcId,
            traceId: data.traceId,
            triggerChapterNumber: data.chapterNumber,
            llmProvider: data.llmProvider,
            modelRoutes: data.modelRoutes,
          });
          log.info({ refreshJobId }, "enqueued arc summary refresh");
        } catch (enqueueErr) {
          log.warn({ err: enqueueErr }, "failed to enqueue arc summary refresh");
        }
      }
    }

    log.info(
      { chapterId, status: finalStatus, wordCount },
      "generate-chapter pipeline completed",
    );

    return {
      chapterId,
      status: finalStatus,
      attempts: attemptCount,
      totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
      totalCostUsd: totalCost,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    log.error({ err, chapterId }, "generate-chapter pipeline failed");
    await db
      .update(chapters)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .catch(() => {});
    throw err;
  }
}

/** Maximum number of pipeline attempts (1 initial + N-1 retries). */
const MAX_PIPELINE_ATTEMPTS = 3;
/** Delay in ms before each retry attempt (index 0 = before attempt 2, index 1 = before attempt 3). */
const PIPELINE_RETRY_BACKOFF_MS = [5_000, 15_000] as const;

export async function runGenerateChapterJob(
  data: GenerateChapterJob,
  ctx: { logger: Logger },
): Promise<GenerateChapterJobResult> {
  const { getDb } = await import("@novel/db");

  const db = getDb();
  const baseConfig = await loadEffectiveStoryConfig(data.storyId);
  const effectiveConfig = data.modelRoutes
    ? {
        ...baseConfig,
        model: {
          ...baseConfig.model,
          routes: {
            ...baseConfig.model.routes,
            ...data.modelRoutes,
          },
        },
      }
    : baseConfig;
  const baseProvider = buildWorkerProvider(data);
  const recorder = makeDrizzleRecorder(db);
  const logLlmPrompts =
    process.env.LOG_LLM_PROMPTS === "1" ||
    process.env.LOG_LLM_PROMPTS === "true";
  const provider = new LoggedLLMProvider({
    inner: baseProvider,
    recordCall: recorder,
    ...(logLlmPrompts
      ? {
          logPrompts: {
            log: (bindings, msg) => {
              // Pino emits one-line JSON; real multiline pretty output goes to stdout.
              ctx.logger
                .child({ component: "llm_prompt", storyId: bindings.storyId })
                .info(
                  {
                    model: bindings.model,
                    agentRole: bindings.agentRole,
                    traceId: bindings.traceId,
                    storyId: bindings.storyId,
                  },
                  msg,
                );
              console.log(
                `\n── ${msg} ──\n${formatLlmPromptPayloadForTerminal(bindings as unknown as LlmPromptLogPayload)}\n`,
              );
            },
          },
        }
      : {}),
  });
  const embeddingService = new OpenRouterEmbeddingService({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    logger: ctx.logger as any,
  });

  const deps: GenerateChapterDeps = {
    db,
    provider,
    embeddingService,
    logger: ctx.logger,
    mode: data.mode ?? "safe",
    effectiveConfig,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_PIPELINE_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const delayMs =
        PIPELINE_RETRY_BACKOFF_MS[attempt - 2] ??
        PIPELINE_RETRY_BACKOFF_MS[PIPELINE_RETRY_BACKOFF_MS.length - 1];
      ctx.logger.warn(
        {
          attempt,
          maxAttempts: MAX_PIPELINE_ATTEMPTS,
          delayMs,
          storyId: data.storyId,
          chapterNumber: data.chapterNumber,
        },
        "retrying generate-chapter pipeline after failure",
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      return await executeGenerateChapterPipeline(
        { ...data, retryAttempt: attempt },
        deps,
      );
    } catch (err) {
      lastError = err;
      ctx.logger.error(
        {
          err,
          attempt,
          maxAttempts: MAX_PIPELINE_ATTEMPTS,
          storyId: data.storyId,
          chapterNumber: data.chapterNumber,
        },
        `generate-chapter pipeline attempt ${attempt}/${MAX_PIPELINE_ATTEMPTS} failed`,
      );
    }
  }

  // All attempts exhausted — re-throw the last error so BullMQ marks the job as failed.
  throw lastError;
}
