import { eq, and } from "drizzle-orm";
import {
  chapters,
  chapterPackets,
  chapterSummaries,
  contextPackets,
  validations,
} from "@novel/db/schema";
import type { Db } from "@novel/db";
import type { Logger } from "pino";
import {
  PacketGenerator,
  type PacketGenerationResult,
  WriterAgent,
  LlmValidatorAgent,
  AutoFixerAgent,
  CanonExtractor,
  type CanonExtractionResult,
  SummaryCompactor,
  auditPacket,
  buildChecks,
  runDeterministicValidator,
  type DeterministicValidatorResult,
  buildContext,
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
  getRecentSummaries,
  type EmbeddingService,
  OpenRouterEmbeddingService,
  formatValidationReport,
  loadStoryDomainContext,
  type StoryDomainContext,
} from "@novel/ai";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenCodeProvider } from "@novel/ai/providers/opencode";
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
  estimateCostUsd,
  estimateTokensJson,
  modelFor,
  parseLlmProvider,
  type AgentRole,
  type EffectiveConfig,
} from "@novel/core";
import type { GenerateChapterJob } from "../queues.js";
import type { GenerateChapterJobResult } from "./generate-chapter.types.js";
import { loadEffectiveStoryConfig } from "../services/story-config.js";
import {
  enqueueRefreshArcSummary,
  enqueueHighStakesReview,
} from "../services/queue-publisher.js";

export interface GenerateChapterDeps {
  db: Db;
  provider: LLMProvider;
  embeddingService: EmbeddingService;
  logger: Logger;
  mode: "safe" | "semi_auto" | "full_auto";
  effectiveConfig?: EffectiveConfig;
}

function serializeContextForWriter(ctx: ChapterContext): string {
  const parts: string[] = [];

  if (ctx.hot.systemRules) parts.push(`# SYSTEM RULES\n${ctx.hot.systemRules}`);
  if (ctx.hot.bibleCompact)
    parts.push(`# BIBLE COMPACT\n${ctx.hot.bibleCompact}`);
  if (ctx.hot.styleGuide) parts.push(`# STYLE GUIDE\n${ctx.hot.styleGuide}`);
  if (ctx.hot.powerSystem) parts.push(`# POWER RULES\n${ctx.hot.powerSystem}`);

  for (const shot of ctx.hot.styleFewShots) {
    parts.push(`# STYLE EXAMPLE\n${shot.excerpt}`);
  }

  if (ctx.warm.sagaSummary)
    parts.push(`# SAGA SUMMARY\n${ctx.warm.sagaSummary}`);
  if (ctx.warm.arcSummary) parts.push(`# ARC SUMMARY\n${ctx.warm.arcSummary}`);
  if (ctx.warm.activeCharacters.length > 0) {
    const chars = ctx.warm.activeCharacters
      .map(
        (c) =>
          `- ${c.name} [${c.status}] realm=${c.currentRealm ?? "-"} faction=${c.faction ?? "-"}`,
      )
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

function buildCanonSnapshotFromContext(ctx: ChapterContext): CanonSnapshot {
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

  return new OpenCodeProvider({
    apiKey: process.env.OPENCODE_API_KEY ?? "",
    baseUrl: process.env.OPENCODE_BASE_URL,
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
    const recentSummaries = await getRecentSummaries(
      db,
      data.storyId,
      data.chapterNumber,
      5,
    );

    if (!bible)
      throw new Error(`No story bible found for story ${data.storyId}`);

    const overdueThreads = openThreads.filter(
      (t) =>
        t.state !== "resolved" && t.introducedChapter < data.chapterNumber - 10,
    );

    const saga = await getSagaForChapter(db, data.storyId, data.chapterNumber);

    const arcStart = arc?.startChapter ?? data.chapterNumber;
    const arcEnd = arc?.endChapter ?? data.chapterNumber;
    const arcSpan = Math.max(1, arcEnd - arcStart + 1);
    const arcPosition = data.chapterNumber - arcStart + 1;
    const arcProgressPct = Math.round((arcPosition / arcSpan) * 100);
    const chaptersRemainingInArc = Math.max(0, arcEnd - data.chapterNumber);

    let pacingHint = "";
    if (arc?.endChapter != null && arc?.startChapter != null) {
      const urgency =
        arcProgressPct >= 80
          ? `Chỉ còn ${chaptersRemainingInArc} chương trong arc — nên đẩy plot về phía climax, tránh filler hoặc kéo dài không cần thiết.`
          : arcProgressPct >= 50
            ? `Đã qua nửa arc — mỗi chương nên có tiến triển rõ rệt về nhân vật hoặc resolve ít nhất 1 thread.`
            : `Giai đoạn xây dựng arc — mỗi chương nên đẩy ít nhất 1 thread tiến lên.`;
      pacingHint = `\n\n# PACING (arc ${arcPosition}/${arcSpan} ≈ ${arcProgressPct}%)\n${urgency}`;
    }

    if (
      saga?.startChapter != null &&
      saga?.endChapter != null &&
      Array.isArray(saga.expectedTurningPoints) &&
      saga.expectedTurningPoints.length > 0
    ) {
      const sagaSpan = Math.max(1, saga.endChapter - saga.startChapter + 1);
      const sagaPosition = data.chapterNumber - saga.startChapter + 1;
      const sagaProgressPct = Math.round((sagaPosition / sagaSpan) * 100);
      const tps = saga.expectedTurningPoints as string[];
      const expectedTpIndex = Math.min(
        tps.length - 1,
        Math.floor((sagaPosition - 1) / (sagaSpan / tps.length)),
      );
      const tpList = tps
        .map((tp, i) => {
          const marker =
            i < expectedTpIndex
              ? "[trễ tiến độ]"
              : i === expectedTpIndex
                ? "[đang diễn ra]"
                : "[sắp tới]";
          return `${i + 1}. ${marker} ${tp}`;
        })
        .join("\n");
      pacingHint += `\n\n# SAGA PACING (saga ${sagaPosition}/${sagaSpan} ≈ ${sagaProgressPct}%)
Đối chiếu với # 5 CHƯƠNG GẦN NHẤT: nếu turning point được đánh dấu [trễ tiến độ] mà chưa thấy trong các chương đó, chương này nên đẩy nó xảy ra để truyện bắt kịp nhịp saga.
Turning points của saga:
${tpList}`;

      const overdueTps = tps.slice(0, expectedTpIndex);
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
      overdueThreads: overdueThreads.map((t) => ({
        title: t.title,
        introducedChapter: t.introducedChapter,
      })),
      forbiddenRules: bible.forbiddenRules,
      chapterNumber: data.chapterNumber,
      arcGoals: (arc?.mainConflict ?? arc?.premise ?? "") + pacingHint,
    };

    const packetModel = modelForRole(effectiveConfig, "packet_generator");
    const packetGen = new PacketGenerator({
      provider,
      logger: log,
      model: packetModel,
    });
    let packetResult: PacketGenerationResult;
    let attemptCount = 1;

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
      },
    );
    accumulateUsage(packetResult.usage, tokenAcc);
    totalCost += estimateCostUsd(packetModel, packetResult.usage);

    const overdueTurningPoints: string[] =
      saga?.startChapter != null &&
      saga?.endChapter != null &&
      Array.isArray(saga.expectedTurningPoints)
        ? (() => {
            const tps = saga.expectedTurningPoints as string[];
            const sagaSpanLocal = Math.max(
              1,
              saga.endChapter! - saga.startChapter! + 1,
            );
            const sagaPosLocal = data.chapterNumber - saga.startChapter! + 1;
            const expectedIdx = Math.min(
              tps.length - 1,
              Math.floor((sagaPosLocal - 1) / (sagaSpanLocal / tps.length)),
            );
            return tps.slice(0, expectedIdx);
          })()
        : [];

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
    };

    const auditResult = auditPacket(auditInput, {
      genreFamily: domain.genreFamily,
    });

    if (auditResult.requiresRegenerate && attemptCount < 2) {
      log.warn(
        { issues: auditResult.issues },
        "packet audit failed, regenerating with hints",
      );
      const hints = auditResult.issues.map((i) => i.message);
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
          auditHints: hints,
        },
      );
      attemptCount++;
      accumulateUsage(packetResult.usage, tokenAcc);
      totalCost += estimateCostUsd(packetModel, packetResult.usage);
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
    });

    await db
      .update(chapters)
      .set({
        packetAuditStatus: auditResult.pass ? "passed" : "failed",
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

    const serializedContext = serializeContextForWriter(context);

    const writerModel = modelForRole(effectiveConfig, "writer");
    const writer = new WriterAgent({
      provider,
      logger: log,
      model: writerModel,
    });
    let writerResult = await writer.write({
      serializedContext,
      cacheKey: context.meta.hotHash,
      chapterNumber: data.chapterNumber,
      storyId: data.storyId,
      traceId,
      genreDef: domain.genreDef,
    });
    accumulateUsage(writerResult.usage, tokenAcc);
    totalCost += estimateCostUsd(writerModel, writerResult.usage);

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

    await db
      .update(chapters)
      .set({
        deterministicValidation: detResult.checks,
        validationStatus: detResult.pass ? "passed" : "failed",
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));
    await persistValidationRows(db, {
      storyId: data.storyId,
      chapterId,
      checks: detResult.checks,
      validatorModel: "deterministic",
    });

    if (detResult.shortCircuited || !detResult.pass) {
      const criticalIssues = detResult.checks.filter(
        (c) => !c.pass && (c.severity === "critical" || c.severity === "high"),
      );
      if (criticalIssues.length > 0) {
        log.error(
          { criticalIssues },
          "deterministic validation had critical issues, marking chapter as failed",
        );
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
          if (mode === "safe") {
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
                contextCacheKey: context.meta.hotHash,
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
        }

        if (nonCriticalIssues.length > 0) {
          log.info(
            { nonCriticalIssues },
            "LLM validator found low/medium issues, auto-fixing",
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
            issues: nonCriticalIssues,
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
    }

    const canonExtractorModel = modelForRole(
      effectiveConfig,
      "canon_extractor",
    );
    const canonExtractor = new CanonExtractor({
      provider,
      logger: log,
      model: canonExtractorModel,
    });
    const canonSnapshot = buildCanonSnapshotFromContext(context);
    const canonSnapshotText = buildCanonSnapshotText(canonSnapshot);

    const extractionResult = await canonExtractor.extract(
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
      },
      { traceId, storyId: data.storyId },
    );
    accumulateUsage(extractionResult.usage, tokenAcc);
    totalCost += estimateCostUsd(canonExtractorModel, extractionResult.usage);

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

    const summaryModel = modelForRole(effectiveConfig, "summary_compactor");
    const summaryCompactor = new SummaryCompactor({
      provider,
      logger: log,
      model: summaryModel,
    });
    const summaryResult = await summaryCompactor.compact(
      {
        chapterNumber: data.chapterNumber,
        chapterContent: writerResult.content,
        previousSummary: context.cold.recentSummaries[0]?.summary ?? "",
        bibleCompact: context.hot.bibleCompact,
      },
      { traceId, storyId: data.storyId },
    );
    accumulateUsage(summaryResult.usage, tokenAcc);
    totalCost += estimateCostUsd(summaryModel, summaryResult.usage);

    try {
      const embResp = await embeddingService.embed({
        input: summaryResult.output.summary,
        traceId,
      });
      await db.insert(chapterSummaries).values({
        chapterId,
        storyId: data.storyId,
        chapterNumber: data.chapterNumber,
        summary: summaryResult.output.summary,
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
        summary: summaryResult.output.summary,
      });
    }

    const wordCount = writerResult.content.split(/\s+/).length;
    const finalStatus: GenerateChapterJobResult["status"] =
      mergerMode === "review" && mergerResult.pendingCount > 0
        ? "paused_pending_updates"
        : "completed";

    await db
      .update(chapters)
      .set({
        title: writerResult.title,
        content: writerResult.content,
        summary: summaryResult.output.summary,
        status:
          finalStatus === "paused_pending_updates"
            ? "paused_pending_updates"
            : "completed",
        wordCount,
        contextCacheKey: context.meta.hotHash,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    if (
      (finalStatus === "completed" ||
        finalStatus === "paused_pending_updates") &&
      resolvedArcId
    ) {
      try {
        const refreshJobId = await enqueueRefreshArcSummary({
          storyId: data.storyId,
          arcId: resolvedArcId,
          traceId: data.traceId,
          llmProvider: data.llmProvider,
          modelRoutes: data.modelRoutes,
        });
        log.info({ refreshJobId }, "enqueued arc summary refresh");
      } catch (enqueueErr) {
        log.warn({ err: enqueueErr }, "failed to enqueue arc summary refresh");
      }

      if (
        arc &&
        arc.endChapter != null &&
        data.chapterNumber === arc.endChapter
      ) {
        try {
          const reviewJobId = await enqueueHighStakesReview({
            storyId: data.storyId,
            chapterId,
            chapterNumber: data.chapterNumber,
            triggerReason: "arc_end",
            traceId: data.traceId,
            llmProvider: data.llmProvider,
            modelRoutes: data.modelRoutes,
          });
          log.info({ reviewJobId }, "enqueued high-stakes review for arc end");
        } catch (enqueueErr) {
          log.warn({ err: enqueueErr }, "failed to enqueue high-stakes review");
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
