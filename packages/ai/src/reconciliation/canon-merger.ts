import { eq, and } from 'drizzle-orm';
import { characters, canonFacts, openThreads, timelineEvents, pendingCanonUpdates, plantedSeeds, factions } from '@novel/db/schema';
import type { CanonSnapshot } from './conflict-detector.ts';
import type { EmbeddingService } from '../embeddings/types.ts';
import type { ExtractorOutput } from '../schemas/extractor.ts';
import { detectConflicts, type ConflictEntry } from './conflict-detector.ts';
import type { ImportanceLevel, CanonConflictType } from '@novel/core';
import { ConflictResolverAgent } from '../agents/conflict-resolver.ts';
import type { LLMProvider } from '../providers/types.ts';

export type CanonMergerDeps = {
  db: import('drizzle-orm/node-postgres').NodePgDatabase<Record<string, never>>;
  embeddingService: EmbeddingService;
  /** Optional LLM provider for conflict-resolver suggestions. Omit in tests or when not needed. */
  provider?: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void };
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
  /** How many rows were auto-approved because conflictStatus=none AND importance=low in review mode. */
  autoApprovedLowImportanceCount: number;
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
          visibility: (r.payload.visibility as 'public' | 'restricted' | 'secret') ?? 'restricted',
          knownBy: (r.payload.knownBy as string[]) ?? [],
          validUntilChapter: r.payload.validUntilChapter as number | undefined,
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
      factionUpdates: params.rows
        .filter(r => r.targetTable === 'factions')
        .map(r => ({
          action: r.updateType as 'create' | 'update',
          targetId: r.targetId ?? undefined,
          name: (r.payload.name as string) ?? '',
          fields: (r.payload.fields as Record<string, unknown>) ?? {},
        })),
      seedsResolvedThisChapter: params.seedsResolvedIds,
    };

    const conflicts = detectConflicts(extracted, snapshot);
    const pendingRows: (typeof pendingCanonUpdates.$inferInsert)[] = [];
    const autoApplyRows: CanonMergerRow[] = [];
    const autoApprovedLowRows: CanonMergerRow[] = [];

    // §3.3 — conflict resolver for suggestion generation (only when provider available).
    const resolver = this.deps.provider
      ? new ConflictResolverAgent({ provider: this.deps.provider, logger: this.deps.logger })
      : null;

    for (const row of params.rows) {
      const payloadFields = (row.payload.fields as Record<string, unknown> | undefined) ?? {};
      const hasConflict = conflicts.some(c => {
        if (c.targetTable !== row.targetTable) return false;
        // Update rows carry a concrete targetId; require an exact id match plus
        // the conflicting payload key to be set on this specific row.
        // The key may be at top-level payload OR inside nested `fields` (for character/faction updates).
        if (row.targetId != null) {
          return c.targetId === row.targetId &&
            (row.payload[c.payloadKey] !== undefined || payloadFields[c.payloadKey] !== undefined);
        }
        // Create rows have no id yet, so any same-table conflict that flags a
        // payload key actually present on this row should route to pending
        // (e.g. `duplicate_fact`, `duplicate_faction`).
        return row.payload[c.payloadKey] !== undefined || payloadFields[c.payloadKey] !== undefined;
      });

      if (hasConflict) {
        const conflictReasons = conflicts
          .filter(c => c.targetTable === row.targetTable && c.targetId === row.targetId)
          .map(c => c.reason) as CanonConflictType[];

        // §3.3 — attempt to generate a suggested resolution before writing to pending.
        let suggestedResolution: Record<string, unknown> | undefined;
        if (resolver) {
          const suggestion = await resolver.suggest({
            updateRow: row,
            snapshot,
            conflictReasons,
            traceId: params.traceId,
            storyId: params.storyId,
          });
          if (suggestion) suggestedResolution = suggestion;
        }

        pendingRows.push({
          storyId: params.storyId,
          chapterId: params.chapterId,
          updateType: row.updateType,
          targetTable: row.targetTable,
          targetId: row.targetId,
          payload: row.payload,
          conflictStatus: 'conflict',
          conflictReasons,
          suggestedResolution,
          resolution: 'pending',
        });
      } else if (params.mode === 'review') {
        // §3.2 — auto-approve low-importance clean rows even in review mode.
        const importance = row.payload.importance as string | undefined;
        if (importance === 'low') {
          autoApprovedLowRows.push(row);
        } else {
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
        }
      } else {
        autoApplyRows.push(row);
      }
    }

    if (pendingRows.length > 0) {
      await this.deps.db.insert(pendingCanonUpdates).values(pendingRows);
    }

    let autoAppliedCount = 0;
    let autoApprovedLowImportanceCount = 0;

    // §3.2 — apply low-importance clean rows regardless of mode.
    for (const row of autoApprovedLowRows) {
      await this.applyRow(row, params.storyId, params.chapterNumber, params.traceId);
      autoApprovedLowImportanceCount++;
      this.deps.logger?.info({
        traceId: params.traceId,
        storyId: params.storyId,
        targetTable: row.targetTable,
        targetId: row.targetId,
        metadata: { canon_merger_auto_apply: true, reason: 'low_importance_clean' },
      }, 'canon merger auto-applied low-importance clean row');
    }

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
      autoApprovedLowImportanceCount,
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
        const importance = ((row.payload.importance as string) ?? 'medium') as ImportanceLevel;
        const visibility = (row.payload.visibility as 'public' | 'restricted' | 'secret') ?? 'restricted';
        const knownBy = (row.payload.knownBy as string[]) ?? [];
        const validUntilChapter = row.payload.validUntilChapter as number | undefined;
        const embResp = await this.deps.embeddingService.embed({
          input: factText,
          traceId,
        });
        const [insertedFact] = await this.deps.db.insert(canonFacts).values({
          storyId,
          topic: topicText,
          fact: factText,
          sourceChapter: chapterNumber,
          importance,
          locked: importance === 'locked',
          embedding: embResp.vector,
          visibility,
          knownBy,
          validUntilChapter,
        }).returning({ id: canonFacts.id });

        if (knownBy.length > 0) {
          // Update knowledgeState for each character in knownBy
          for (const characterId of knownBy) {
            const charRows = await this.deps.db.select({ knowledgeState: characters.knowledgeState })
              .from(characters)
              .where(and(eq(characters.id, characterId), eq(characters.storyId, storyId)))
              .limit(1);

            if (charRows.length > 0 && charRows[0]) {
              const currentState = (charRows[0].knowledgeState as Record<string, number>) ?? {};
              const newState = { ...currentState, [insertedFact!.id]: chapterNumber };
              await this.deps.db.update(characters)
                .set({ knowledgeState: newState, updatedAt: new Date() })
                .where(and(eq(characters.id, characterId), eq(characters.storyId, storyId)));
            }
          }
        }
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
          importance: ((row.payload.significance as string) ?? 'minor') as ImportanceLevel,
          relatedCharacterIds: (row.payload.charactersInvolved as string[]) ?? [],
        });
        break;
      }
      case 'planted_seeds': {
        if (row.targetId) {
          const status = (row.payload.status as string | undefined) ?? 'paid_off';
          const paidOffAtChapter = (row.payload.paidOffAtChapter as number | undefined) ?? chapterNumber;

          if (status === 'paid_off') {
            const seedRows = await this.deps.db.select({ plantedInChapter: plantedSeeds.plantedInChapter })
              .from(plantedSeeds)
              .where(and(eq(plantedSeeds.id, row.targetId), eq(plantedSeeds.storyId, storyId)))
              .limit(1);

            if (seedRows.length === 0) {
              throw new Error(`Planted seed ${row.targetId} not found`);
            }

            const plantedInChapter = seedRows[0]!.plantedInChapter!;
            if (paidOffAtChapter < plantedInChapter) {
              throw new Error(`Invalid state transition: paidOffAtChapter (${paidOffAtChapter}) cannot be before plantedInChapter (${plantedInChapter})`);
            }
          }

          await this.deps.db.update(plantedSeeds)
            .set({
              status,
              paidOffAtChapter,
            })
            .where(and(eq(plantedSeeds.id, row.targetId), eq(plantedSeeds.storyId, storyId)));
        }
        break;
      }
      case 'factions': {
        if (row.updateType === 'create') {
          // For create rows, the worker emits the new fields at the top level of the payload
          // (mirroring the character create-row shape) so the merger can persist them directly.
          const fields = (row.payload.fields as Record<string, unknown> | undefined) ?? row.payload;
          await this.deps.db.insert(factions).values({
            storyId,
            name: (row.payload.name as string) ?? 'Unnamed',
            type: (fields.type as string | undefined) ?? null,
            ideology: (fields.ideology as string | undefined) ?? null,
            powerLevel: (fields.powerLevel as string | undefined) ?? null,
            knownMembers: (fields.knownMembers as string[] | undefined) ?? [],
            alliances: (fields.alliances as string[] | undefined) ?? [],
            enemies: (fields.enemies as string[] | undefined) ?? [],
            status: (fields.status as string | undefined) ?? 'active',
            notes: (fields.notes as string | undefined) ?? null,
          });
        } else if (row.updateType === 'update' && row.targetId) {
          const fields = (row.payload.fields as Record<string, unknown> | undefined) ?? {};
          const setFields: Record<string, unknown> = {};
          if (fields.type !== undefined) setFields.type = fields.type;
          if (fields.ideology !== undefined) setFields.ideology = fields.ideology;
          if (fields.powerLevel !== undefined) setFields.powerLevel = fields.powerLevel;
          if (fields.status !== undefined) setFields.status = fields.status;
          if (fields.knownMembers !== undefined) setFields.knownMembers = fields.knownMembers;
          if (fields.alliances !== undefined) setFields.alliances = fields.alliances;
          if (fields.enemies !== undefined) setFields.enemies = fields.enemies;
          if (fields.notes !== undefined) setFields.notes = fields.notes;
          if (Object.keys(setFields).length > 0) {
            await this.deps.db.update(factions)
              .set(setFields)
              .where(and(eq(factions.id, row.targetId), eq(factions.storyId, storyId)));
          }
        }
        break;
      }
    }
  }
}
