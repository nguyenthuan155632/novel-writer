import { eq, and } from 'drizzle-orm';
import { characters, canonFacts, openThreads, timelineEvents, pendingCanonUpdates, plantedSeeds } from '@novel/db/schema';
import type { CanonSnapshot } from './conflict-detector.ts';
import type { EmbeddingService } from '../embeddings/types.ts';
import type { ExtractorOutput } from '../schemas/extractor.ts';
import { detectConflicts, type ConflictEntry } from './conflict-detector.ts';

export type CanonMergerDeps = {
  db: import('drizzle-orm/node-postgres').NodePgDatabase<Record<string, never>>;
  embeddingService: EmbeddingService;
};

export type CanonMergerMode = 'auto' | 'review';

export type CanonMergerRow = {
  updateType: string;
  targetTable: string;
  targetId: string | null;
  payload: Record<string, unknown>;
};

export type CanonMergerSubmitParams = {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  rows: CanonMergerRow[];
  seedsResolvedIds: string[];
  mode: CanonMergerMode;
  traceId: string;
};

export type CanonMergerResult = {
  pendingCount: number;
  autoAppliedCount: number;
  conflicts: ConflictEntry[];
};

export class CanonMerger {
  constructor(private readonly deps: CanonMergerDeps) {}

  async submit(params: CanonMergerSubmitParams, snapshot: CanonSnapshot): Promise<CanonMergerResult> {
    const extracted: ExtractorOutput = {
      characterUpdates: params.rows
        .filter(r => r.targetTable === 'characters')
        .map(r => ({
          action: r.updateType as 'create' | 'update',
          targetId: r.targetId ?? undefined,
          name: (r.payload.name as string) ?? '',
          fields: (r.payload.fields as Record<string, unknown>) ?? {},
          intentionalRegression: r.payload.intentionalRegression as boolean | undefined,
        })),
      newCanonFacts: params.rows
        .filter(r => r.targetTable === 'canon_facts')
        .map(r => ({
          topic: (r.payload.topic as string) ?? '',
          fact: r.payload.fact as string,
          importance: r.payload.importance as 'low' | 'medium' | 'high' | 'locked',
        })),
      threadUpdates: params.rows
        .filter(r => r.targetTable === 'open_threads')
        .map(r => ({
          action: r.updateType as 'create' | 'update' | 'resolve',
          targetId: r.targetId ?? undefined,
          title: (r.payload.title as string) ?? '',
          state: r.payload.state as 'open' | 'partial' | 'resolved' | undefined,
          plannedResolutionChapter: r.payload.plannedResolutionChapter as number | undefined,
        })),
      newTimelineEvents: params.rows
        .filter(r => r.targetTable === 'timeline_events')
        .map(r => ({
          description: r.payload.description as string,
          charactersInvolved: (r.payload.charactersInvolved as string[] | undefined) ?? undefined,
          significance: (r.payload.significance as 'minor' | 'major' | 'pivotal' | undefined) ?? 'minor',
        })),
      seedsResolvedThisChapter: params.seedsResolvedIds,
    };

    const conflicts = detectConflicts(extracted, snapshot);
    const pendingRows: (typeof pendingCanonUpdates.$inferInsert)[] = [];
    const autoApplyRows: CanonMergerRow[] = [];

    for (const row of params.rows) {
      const hasConflict = conflicts.some(
        c => c.targetTable === row.targetTable &&
          c.targetId === row.targetId &&
          row.payload[c.payloadKey] !== undefined
      );

      if (hasConflict) {
        const conflictReasons = conflicts
          .filter(c => c.targetTable === row.targetTable && c.targetId === row.targetId)
          .map(c => c.reason);

        pendingRows.push({
          storyId: params.storyId,
          chapterId: params.chapterId,
          updateType: row.updateType,
          targetTable: row.targetTable,
          targetId: row.targetId,
          payload: row.payload,
          conflictStatus: 'conflict',
          conflictReasons,
          resolution: 'pending',
        });
      } else if (params.mode === 'review') {
        pendingRows.push({
          storyId: params.storyId,
          chapterId: params.chapterId,
          updateType: row.updateType,
          targetTable: row.targetTable,
          targetId: row.targetId,
          payload: row.payload,
          conflictStatus: 'none',
          conflictReasons: [],
          resolution: 'pending',
        });
      } else {
        autoApplyRows.push(row);
      }
    }

    if (pendingRows.length > 0) {
      await this.deps.db.insert(pendingCanonUpdates).values(pendingRows);
    }

    let autoAppliedCount = 0;
    if (params.mode === 'auto') {
      for (const row of autoApplyRows) {
        await this.applyRow(row, params.storyId, params.chapterNumber, params.traceId);
        autoAppliedCount++;
      }
      for (const seedId of params.seedsResolvedIds) {
        await this.applyRow({
          updateType: 'update',
          targetTable: 'planted_seeds',
          targetId: seedId,
          payload: { status: 'paid_off', paidOffAtChapter: params.chapterNumber },
        }, params.storyId, params.chapterNumber, params.traceId);
        autoAppliedCount++;
      }
    }

    return {
      pendingCount: pendingRows.length,
      autoAppliedCount,
      conflicts,
    };
  }

  private async applyRow(row: CanonMergerRow, storyId: string, chapterNumber: number, traceId: string): Promise<void> {
    switch (row.targetTable) {
      case 'characters': {
        if (row.updateType === 'create') {
          await this.deps.db.insert(characters).values({
            storyId,
            name: (row.payload.name as string) ?? 'Unnamed',
            currentRealm: row.payload.currentRealm as string | undefined,
            status: (row.payload.status as string) ?? 'alive',
            currentBloodlines: (row.payload.bloodlines as string[]) ?? [],
          });
        } else if (row.updateType === 'update' && row.targetId) {
          const setFields: Record<string, unknown> = {};
          const fields = row.payload.fields as Record<string, unknown> | undefined;
          if (fields) {
            if (fields.currentRealm !== undefined) setFields.currentRealm = fields.currentRealm;
            if (fields.status !== undefined) setFields.status = fields.status;
            if (fields.bloodlines !== undefined) setFields.currentBloodlines = fields.bloodlines;
            if (fields.shortTraits !== undefined) setFields.abilities = fields.shortTraits;
          }
          if (Object.keys(setFields).length > 0) {
            await this.deps.db.update(characters)
              .set({ ...setFields, updatedAt: new Date() })
              .where(and(eq(characters.id, row.targetId), eq(characters.storyId, storyId)));
          }
        }
        break;
      }
      case 'canon_facts': {
        const factText = row.payload.fact as string;
        const topicText = (row.payload.topic as string) ?? '';
        const importance = (row.payload.importance as string) ?? 'medium';
        const embResp = await this.deps.embeddingService.embed({
          input: factText,
          traceId,
        });
        await this.deps.db.insert(canonFacts).values({
          storyId,
          topic: topicText,
          fact: factText,
          sourceChapter: chapterNumber,
          importance,
          locked: importance === 'locked',
          embedding: embResp.vector,
        });
        break;
      }
      case 'open_threads': {
        if (row.updateType === 'create') {
          await this.deps.db.insert(openThreads).values({
            storyId,
            title: (row.payload.title as string) ?? 'Untitled',
            openedChapter: chapterNumber,
            plannedResolutionChapter: row.payload.plannedResolutionChapter as number | undefined,
            status: 'open',
          });
        } else if (row.updateType === 'update' && row.targetId) {
          const setFields: Record<string, unknown> = {};
          if (row.payload.title !== undefined) setFields.title = row.payload.title;
          if (row.payload.state !== undefined) setFields.status = row.payload.state;
          if (row.payload.plannedResolutionChapter !== undefined) setFields.plannedResolutionChapter = row.payload.plannedResolutionChapter;
          if (Object.keys(setFields).length > 0) {
            await this.deps.db.update(openThreads)
              .set({ ...setFields, updatedAt: new Date() })
              .where(and(eq(openThreads.id, row.targetId), eq(openThreads.storyId, storyId)));
          }
        } else if (row.updateType === 'resolve' && row.targetId) {
          await this.deps.db.update(openThreads)
            .set({ status: 'resolved', resolutionNotes: row.payload.resolutionNotes as string | undefined, updatedAt: new Date() })
            .where(and(eq(openThreads.id, row.targetId), eq(openThreads.storyId, storyId)));
        }
        break;
      }
      case 'timeline_events': {
        await this.deps.db.insert(timelineEvents).values({
          storyId,
          chapterNumber,
          eventText: row.payload.description as string,
          importance: (row.payload.significance as string) ?? 'minor',
          relatedCharacterIds: (row.payload.charactersInvolved as string[]) ?? [],
        });
        break;
      }
      case 'planted_seeds': {
        if (row.targetId) {
          await this.deps.db.update(plantedSeeds)
            .set({
              status: (row.payload.status as string | undefined) ?? 'paid_off',
              paidOffAtChapter: (row.payload.paidOffAtChapter as number | undefined) ?? chapterNumber,
            })
            .where(and(eq(plantedSeeds.id, row.targetId), eq(plantedSeeds.storyId, storyId)));
        }
        break;
      }
    }
  }
}
