import { eq, and } from 'drizzle-orm';
import { chapters, chapterPackets, chapterSummaries } from '@novel/db/schema';
import type { Db } from '@novel/db';
import type { Logger } from 'pino';
import {
  PacketGenerator,
  type PacketGenerationResult,
  WriterAgent,
  LlmValidatorAgent,
  AutoFixerAgent,
  CanonExtractor,
  type CanonExtractionResult,
  SummaryCompactor,
  type SummaryCompactionResult,
  auditPacket,
  buildChecks,
  runDeterministicValidator,
  type DeterministicValidatorResult,
  buildContext,
  type ChapterContext,
  type ChapterPacket,
  type CheckInput,
  detectConflicts,
  CanonMerger,
  type CanonMergerMode,
  type CanonMergerRow,
  type CanonSnapshot,
  getStoryBible,
  getArcById,
  getArcForChapter,
  getActiveCharacters,
  getOpenThreadsForStory,
  getPlantedSeedsForStory,
  getSeedsDueForChapter,
  getRecentSummaries,
  type EmbeddingService,
  OpenRouterEmbeddingService,
  MockEmbeddingService,
} from '@novel/ai';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import type { LLMProvider, CompletionUsage } from '@novel/ai/providers/types';
import { estimateCostUsd } from '@novel/core';
import type { GenerateChapterJob } from '../queues.js';
import type { GenerateChapterJobResult } from './generate-chapter.types.js';

export interface GenerateChapterDeps {
  db: Db;
  provider: LLMProvider;
  embeddingService: EmbeddingService;
  logger: Logger;
  mode: 'safe' | 'semi_auto' | 'full_auto';
}

function serializeContextForWriter(ctx: ChapterContext): string {
  const parts: string[] = [];

  if (ctx.hot.systemRules) parts.push(`# SYSTEM RULES\n${ctx.hot.systemRules}`);
  if (ctx.hot.bibleCompact) parts.push(`# BIBLE COMPACT\n${ctx.hot.bibleCompact}`);
  if (ctx.hot.styleGuide) parts.push(`# STYLE GUIDE\n${ctx.hot.styleGuide}`);
  if (ctx.hot.powerRules) parts.push(`# POWER RULES\n${ctx.hot.powerRules}`);

  for (const shot of ctx.hot.styleFewShots) {
    parts.push(`# STYLE EXAMPLE\n${shot.excerpt}`);
  }

  if (ctx.warm.sagaSummary) parts.push(`# SAGA SUMMARY\n${ctx.warm.sagaSummary}`);
  if (ctx.warm.arcSummary) parts.push(`# ARC SUMMARY\n${ctx.warm.arcSummary}`);
  if (ctx.warm.activeCharacters.length > 0) {
    const chars = ctx.warm.activeCharacters
      .map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'}`)
      .join('\n');
    parts.push(`# ACTIVE CHARACTERS\n${chars}`);
  }
  if (ctx.warm.arcOpenThreads.length > 0) {
    const threads = ctx.warm.arcOpenThreads
      .map(t => `- ${t.title} [${t.state}] (from ch${t.introducedChapter})`)
      .join('\n');
    parts.push(`# OPEN THREADS\n${threads}`);
  }
  if (ctx.warm.arcPlantedSeeds.length > 0) {
    const seeds = ctx.warm.arcPlantedSeeds
      .map(s => `- "${s.seedText}" → ${s.payoffDescription} [${s.status}]`)
      .join('\n');
    parts.push(`# PLANTED SEEDS\n${seeds}`);
  }

  if (ctx.cold.recentSummaries.length > 0) {
    const sums = ctx.cold.recentSummaries.map(s => `- Ch${s.chapterNumber}: ${s.shortSummary}`).join('\n');
    parts.push(`# RECENT SUMMARIES\n${sums}`);
  }
  if (ctx.cold.retrievedFacts.length > 0) {
    const facts = ctx.cold.retrievedFacts.map(f => `- [${f.importance}] ${f.fact}`).join('\n');
    parts.push(`# CANON FACTS\n${facts}`);
  }
  if (ctx.cold.retrievedPastChapters.length > 0) {
    const past = ctx.cold.retrievedPastChapters.map(s => `- Ch${s.chapterNumber}: ${s.shortSummary}`).join('\n');
    parts.push(`# PAST CHAPTER SUMMARIES\n${past}`);
  }
  if (ctx.cold.seedsToPlantNow.length > 0) {
    const due = ctx.cold.seedsToPlantNow
      .map(s => `- MUST PLANT: "${s.seedText}" (id=${s.id}) → ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`)
      .join('\n');
    parts.push(`# SEEDS DUE THIS CHAPTER\n${due}`);
  }

  if (ctx.cold.packet) {
    const p = ctx.cold.packet;
    parts.push(`# CHAPTER PLAN (packet)`);
    parts.push(`Goal: ${p.goal}`);
    parts.push(`Conflict: ${p.conflict}`);
    parts.push(`Cliffhanger: ${p.cliffhanger}`);
    parts.push(`Characters present: ${p.charactersPresent.join(', ')}`);
    if (p.forbiddenMoves.length > 0) parts.push(`Forbidden: ${p.forbiddenMoves.join('; ')}`);
  }

  return parts.join('\n\n');
}

function buildCanonSnapshotFromContext(ctx: ChapterContext): CanonSnapshot {
  return {
    characters: ctx.warm.activeCharacters.map(c => ({
      id: c.id,
      name: c.name,
      currentRealm: c.currentRealm,
      status: c.status,
      currentBloodlines: c.bloodlines,
      faction: c.faction,
      lockedFields: [],
    })),
    canonFacts: ctx.cold.retrievedFacts.map(f => ({
      id: f.id,
      fact: f.fact,
      importance: f.importance,
      locked: f.importance === 'locked',
    })),
    threads: ctx.warm.arcOpenThreads.map(t => ({
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
      .map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} bloodlines=${c.currentBloodlines.join(',')} locked=${c.lockedFields.join(',')}`)
      .join('\n');
    parts.push(`## Characters\n${chars}`);
  }
  if (snapshot.canonFacts.length > 0) {
    const facts = snapshot.canonFacts.map(f => `- [${f.importance}${f.locked ? '/LOCKED' : ''}] ${f.fact}`).join('\n');
    parts.push(`## Canon Facts\n${facts}`);
  }
  if (snapshot.threads.length > 0) {
    const threads = snapshot.threads.map(t => `- ${t.title} [${t.status}]`).join('\n');
    parts.push(`## Threads\n${threads}`);
  }
  return parts.join('\n\n');
}

function buildCheckCanon(ctx: ChapterContext): CheckInput['canon'] {
  return {
    deadCharacterNames: ctx.warm.activeCharacters
      .filter(c => c.status === 'dead')
      .map(c => c.name),
    knownCharacterNames: ctx.warm.activeCharacters.map(c => c.name),
    knownLocationNames: [],
    knownBloodlineNames: ctx.warm.activeCharacters
      .flatMap(c => c.bloodlines)
      .filter((v, i, a) => a.indexOf(v) === i),
    lockedFacts: ctx.cold.retrievedFacts
      .filter(f => f.importance === 'locked')
      .map(f => ({ topic: '', fact: f.fact })),
    realmByCharacter: Object.fromEntries(
      ctx.warm.activeCharacters
        .filter(c => c.currentRealm)
        .map(c => [c.name, c.currentRealm])
    ),
  };
}

function extractorOutputToRows(
  extracted: CanonExtractionResult['output'],
  seedsResolvedIds: string[],
): CanonMergerRow[] {
  const rows: CanonMergerRow[] = [];

  for (const cu of extracted.characterUpdates) {
    const fields: Record<string, unknown> = { ...cu.fields };
    if (cu.action === 'update' && cu.targetId) {
      rows.push({
        updateType: cu.action,
        targetTable: 'characters',
        targetId: cu.targetId,
        payload: { name: cu.name, fields },
      });
    } else if (cu.action === 'create') {
      rows.push({
        updateType: cu.action,
        targetTable: 'characters',
        targetId: null,
        payload: { name: cu.name, ...cu.fields },
      });
    }
  }

  for (const cf of extracted.newCanonFacts) {
    rows.push({
      updateType: 'create',
      targetTable: 'canon_facts',
      targetId: null,
      payload: { topic: cf.topic, fact: cf.fact, importance: cf.importance },
    });
  }

  for (const tu of extracted.threadUpdates) {
    rows.push({
      updateType: tu.action,
      targetTable: 'open_threads',
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
      updateType: 'create',
      targetTable: 'timeline_events',
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

function accumulateUsage(usage: CompletionUsage, acc: { inputTokens: number; outputTokens: number; cachedInputTokens: number }): void {
  acc.inputTokens += usage.inputTokens;
  acc.outputTokens += usage.outputTokens;
  acc.cachedInputTokens += usage.cachedInputTokens;
}

export async function executeGenerateChapterPipeline(
  data: GenerateChapterJob,
  deps: GenerateChapterDeps,
): Promise<GenerateChapterJobResult> {
  const { db, provider, embeddingService, logger } = deps;
  const mode = data.mode ?? 'safe';
  const traceId = data.traceId;
  const start = Date.now();
  const tokenAcc = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let totalCost = 0;

  const log = logger.child({ traceId, storyId: data.storyId, chapterNumber: data.chapterNumber, agent: 'generate_chapter' });

  log.info({ mode }, 'starting generate-chapter pipeline');

  const arc = data.arcId
    ? await getArcById(db, data.arcId)
    : await getArcForChapter(db, data.storyId, data.chapterNumber);
  const resolvedArcId = arc?.id;

  if (!resolvedArcId) {
    throw new Error(`No arc found for story ${data.storyId} chapter ${data.chapterNumber}`);
  }

  const [existing] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.storyId, data.storyId), eq(chapters.chapterNumber, data.chapterNumber)))
    .limit(1);

  let chapterId: string;

  if (existing) {
    if (existing.status === 'completed') {
      log.info({ chapterId: existing.id }, 'chapter already completed, skipping');
      return {
        chapterId: existing.id,
        status: 'completed',
        attempts: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        durationMs: Date.now() - start,
      };
    }
    chapterId = existing.id;
    await db.update(chapters)
      .set({ status: 'generating', updatedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  } else {
    const [inserted] = await db.insert(chapters).values({
      storyId: data.storyId,
      arcId: resolvedArcId,
      chapterNumber: data.chapterNumber,
      status: 'generating',
    }).returning({ id: chapters.id });
    chapterId = inserted!.id;
  }

  try {
    const bible = await getStoryBible(db, data.storyId);
    const activeCharacters = await getActiveCharacters(db, data.storyId, data.chapterNumber);
    const openThreads = await getOpenThreadsForStory(db, data.storyId);
    const allSeeds = await getPlantedSeedsForStory(db, data.storyId);
    const dueSeeds = await getSeedsDueForChapter(db, data.storyId, data.chapterNumber);
    const recentSummaries = await getRecentSummaries(db, data.storyId, data.chapterNumber, 5);

    if (!bible) throw new Error(`No story bible found for story ${data.storyId}`);

    const overdueThreads = openThreads.filter(t =>
      t.state !== 'resolved' &&
      t.introducedChapter < data.chapterNumber - 10
    );

    const packetInput = {
      bibleCompact: bible.compactSummary ?? '',
      arcSummary: arc?.rollingSummary ?? arc?.summary ?? '',
      recentChapterSummaries: recentSummaries.map(s => ({ chapterNumber: s.chapterNumber, shortSummary: s.shortSummary })),
      activeCharacters: activeCharacters.map(c => ({ name: c.name, currentRealm: c.currentRealm, status: c.status, faction: c.faction })),
      openThreads: openThreads.map(t => ({ title: t.title, state: t.state })),
      duePlantedSeeds: dueSeeds.map(s => ({ id: s.id, seedText: s.seedText, payoffDescription: s.payoffDescription, plantWindowEnd: s.plantWindowEnd })),
      overdueThreads: overdueThreads.map(t => ({ title: t.title, introducedChapter: t.introducedChapter })),
      forbiddenRules: bible.forbiddenRules,
      chapterNumber: data.chapterNumber,
      arcGoals: arc?.mainConflict ?? '',
    };

    const packetGen = new PacketGenerator({ provider, logger: log });
    let packetResult: PacketGenerationResult;
    let attemptCount = 1;

    packetResult = await packetGen.generate(packetInput, {
      traceId,
      storyId: data.storyId,
    });
    accumulateUsage(packetResult.usage, tokenAcc);
    totalCost += estimateCostUsd('packet_generator', packetResult.usage);

    const auditInput = {
      packet: packetResult.packet,
      characters: activeCharacters.map(c => ({
        name: c.name,
        status: c.status,
        currentRealm: c.currentRealm,
      })),
      forbiddenRules: bible.forbiddenRules,
      duePlantedSeeds: dueSeeds.map(s => ({
        id: s.id,
        seedText: s.seedText,
        plantWindowEnd: s.plantWindowEnd,
      })),
    };

    const auditResult = auditPacket(auditInput);

    if (auditResult.requiresRegenerate && attemptCount < 2) {
      log.warn({ issues: auditResult.issues }, 'packet audit failed, regenerating with hints');
      const hints = auditResult.issues.map(i => i.message);
      packetResult = await packetGen.generate(packetInput, {
        traceId,
        storyId: data.storyId,
        auditHints: hints,
      });
      attemptCount++;
      accumulateUsage(packetResult.usage, tokenAcc);
      totalCost += estimateCostUsd('packet_generator', packetResult.usage);
    }

    await db.insert(chapterPackets).values({
      storyId: data.storyId,
      chapterId,
      arcId: resolvedArcId,
      chapterNumber: data.chapterNumber,
      goal: packetResult.packet.goal,
      requiredEvents: packetResult.packet.requiredEvents.map(e => e.description),
      charactersInScene: packetResult.packet.charactersPresent,
      conflict: packetResult.packet.conflict,
      cliffhanger: packetResult.packet.cliffhanger,
      forbiddenMoves: packetResult.packet.forbiddenMoves,
    });

    await db.update(chapters)
      .set({ packetAuditStatus: auditResult.pass ? 'passed' : 'failed', updatedAt: new Date() })
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
    });

    const serializedContext = serializeContextForWriter(context);

    const writer = new WriterAgent({ provider, logger: log });
    let writerResult = await writer.write({
      serializedContext,
      cacheKey: context.meta.hotHash,
      chapterNumber: data.chapterNumber,
      storyId: data.storyId,
      traceId,
    });
    accumulateUsage(writerResult.usage, tokenAcc);
    totalCost += estimateCostUsd('writer', writerResult.usage);

    const checkCanon = buildCheckCanon(context);
    const checkInput: CheckInput = {
      content: writerResult.content,
      context,
      chapter: { id: chapterId, chapterNumber: data.chapterNumber },
      story: { id: data.storyId },
      canon: checkCanon,
    };

    const checks = buildChecks(bible.forbiddenRules);
    const detResult: DeterministicValidatorResult = runDeterministicValidator(checkInput, checks);

    await db.update(chapters)
      .set({
        deterministicValidation: detResult.checks,
        validationStatus: detResult.pass ? 'passed' : 'failed',
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    if (detResult.shortCircuited || !detResult.pass) {
      const criticalIssues = detResult.checks.filter(c => !c.pass && (c.severity === 'critical' || c.severity === 'high'));
      if (criticalIssues.length > 0) {
        log.error({ criticalIssues }, 'deterministic validation had critical issues, marking chapter as failed');
        await db.update(chapters)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(chapters.id, chapterId));
        return {
          chapterId,
          status: 'failed',
          attempts: attemptCount,
          totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
          totalCostUsd: totalCost,
          durationMs: Date.now() - start,
        };
      }
    }

    let llmValidatorOutput: { pass: boolean; issues: { code: string; severity: string; message: string }[] } | null = null;
    if (!detResult.shortCircuited) {
      const llmValidator = new LlmValidatorAgent({ provider, logger: log });
      const llmValResult = await llmValidator.validate({
        serializedContext,
        chapterContent: writerResult.content,
        chapterTitle: writerResult.title,
        chapterNumber: data.chapterNumber,
        storyId: data.storyId,
        traceId,
      });
      accumulateUsage(llmValResult.usage, tokenAcc);
      totalCost += estimateCostUsd('llm_validator', llmValResult.usage);
      llmValidatorOutput = llmValResult.output;

      if (!llmValResult.output.pass) {
        const nonCriticalIssues = llmValResult.output.issues.filter(
          i => i.severity === 'low' || i.severity === 'medium'
        );
        const criticalLlmIssues = llmValResult.output.issues.filter(
          i => i.severity === 'critical' || i.severity === 'high'
        );

        if (criticalLlmIssues.length > 0) {
          log.warn({ criticalLlmIssues }, 'LLM validator found critical/high issues');
          if (mode === 'safe') {
            await db.update(chapters)
              .set({ status: 'paused_pending_updates', updatedAt: new Date() })
              .where(eq(chapters.id, chapterId));
            return {
              chapterId,
              status: 'paused_pending_updates',
              attempts: attemptCount,
              totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
              totalCostUsd: totalCost,
              durationMs: Date.now() - start,
            };
          }
        }

        if (nonCriticalIssues.length > 0) {
          log.info({ nonCriticalIssues }, 'LLM validator found low/medium issues, auto-fixing');
          const autoFixer = new AutoFixerAgent({ provider, logger: log });
          const fixResult = await autoFixer.fix({
            serializedContext,
            chapterContent: writerResult.content,
            chapterTitle: writerResult.title,
            chapterNumber: data.chapterNumber,
            issues: nonCriticalIssues,
            storyId: data.storyId,
            traceId,
          });
          accumulateUsage(fixResult.usage, tokenAcc);
          totalCost += estimateCostUsd('auto_fixer', fixResult.usage);
          writerResult = { title: fixResult.title, content: fixResult.content, usage: fixResult.usage, cost: fixResult.cost };
        }
      }
    }

    const canonExtractor = new CanonExtractor({ provider, logger: log });
    const canonSnapshot = buildCanonSnapshotFromContext(context);
    const canonSnapshotText = buildCanonSnapshotText(canonSnapshot);

    const extractionResult = await canonExtractor.extract({
      chapterNumber: data.chapterNumber,
      chapterContent: writerResult.content,
      bibleCompact: context.hot.bibleCompact,
      canonSnapshot: canonSnapshotText,
      plantedSeeds: context.warm.arcPlantedSeeds.map(s => ({
        id: s.id,
        seedText: s.seedText,
        payoffDescription: s.payoffDescription,
        status: s.status,
      })),
      recentSummary: context.cold.recentSummaries[0]?.shortSummary ?? '',
    }, { traceId, storyId: data.storyId });
    accumulateUsage(extractionResult.usage, tokenAcc);
    totalCost += estimateCostUsd('canon_extractor', extractionResult.usage);

    const mergerRows = extractorOutputToRows(
      extractionResult.output,
      extractionResult.output.seedsResolvedThisChapter,
    );

    const detectedConflicts = detectConflicts(extractionResult.output, canonSnapshot);

    const canonMerger = new CanonMerger({ db: db as any, embeddingService });
    const mergerMode: CanonMergerMode = mode === 'safe' ? 'review' : 'auto';
    const mergerResult = await canonMerger.submit({
      storyId: data.storyId,
      chapterId,
      chapterNumber: data.chapterNumber,
      rows: mergerRows,
      seedsResolvedIds: extractionResult.output.seedsResolvedThisChapter,
      mode: mergerMode,
      traceId,
    }, canonSnapshot);

    log.info({
      pendingCount: mergerResult.pendingCount,
      autoApplied: mergerResult.autoAppliedCount,
      conflicts: mergerResult.conflicts.length,
    }, 'canon merger completed');

    const summaryCompactor = new SummaryCompactor({ provider, logger: log });
    const summaryResult = await summaryCompactor.compact({
      chapterNumber: data.chapterNumber,
      chapterContent: writerResult.content,
      previousShortSummary: context.cold.recentSummaries[0]?.shortSummary ?? '',
      bibleCompact: context.hot.bibleCompact,
    }, { traceId, storyId: data.storyId });
    accumulateUsage(summaryResult.usage, tokenAcc);
    totalCost += estimateCostUsd('summary_compactor', summaryResult.usage);

    try {
      const embResp = await embeddingService.embed({
        input: summaryResult.output.shortSummary,
        traceId,
      });
      await db.insert(chapterSummaries).values({
        chapterId,
        storyId: data.storyId,
        chapterNumber: data.chapterNumber,
        shortSummary: summaryResult.output.shortSummary,
        detailedSummary: summaryResult.output.detailedSummary,
        embedding: embResp.vector,
      });
    } catch (embErr) {
      log.warn({ err: embErr }, 'failed to embed summary, inserting without embedding');
      await db.insert(chapterSummaries).values({
        chapterId,
        storyId: data.storyId,
        chapterNumber: data.chapterNumber,
        shortSummary: summaryResult.output.shortSummary,
        detailedSummary: summaryResult.output.detailedSummary,
      });
    }

    const wordCount = writerResult.content.split(/\s+/).length;
    const finalStatus: GenerateChapterJobResult['status'] =
      mergerMode === 'review' && mergerResult.pendingCount > 0
        ? 'paused_pending_updates'
        : 'completed';

    await db.update(chapters)
      .set({
        title: writerResult.title,
        content: writerResult.content,
        summary: summaryResult.output.shortSummary,
        status: finalStatus === 'paused_pending_updates' ? 'paused_pending_updates' : 'completed',
        wordCount,
        contextCacheKey: context.meta.hotHash,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    log.info({ chapterId, status: finalStatus, wordCount }, 'generate-chapter pipeline completed');

    return {
      chapterId,
      status: finalStatus,
      attempts: attemptCount,
      totalTokens: tokenAcc.inputTokens + tokenAcc.outputTokens,
      totalCostUsd: totalCost,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    log.error({ err, chapterId }, 'generate-chapter pipeline failed');
    await db.update(chapters)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .catch(() => {});
    throw err;
  }
}

export async function runGenerateChapterJob(
  data: GenerateChapterJob,
  ctx: { logger: Logger },
): Promise<GenerateChapterJobResult> {
  const { getDb } = await import('@novel/db');

  const db = getDb();
  const baseProvider = new OpenRouterProvider({
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
  });
  const recorder = makeDrizzleRecorder(db);
  const provider = new LoggedLLMProvider({ inner: baseProvider, recordCall: recorder });
  const embeddingService = new OpenRouterEmbeddingService({
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    logger: ctx.logger as any,
  });

  return executeGenerateChapterPipeline(data, {
    db,
    provider,
    embeddingService,
    logger: ctx.logger,
    mode: data.mode ?? 'safe',
  });
}