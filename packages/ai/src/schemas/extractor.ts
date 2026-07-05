import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';
import { IMPORTANCE_LEVELS } from '@novel/core';

/** Models often emit placeholders or prose for IDs; drop invalid values instead of failing parse. */
export const optionalUuidFromUnknown = z.unknown().transform((val): string | undefined => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  const t = val.trim();
  if (!t) return undefined;
  const r = z.string().uuid().safeParse(t);
  return r.success ? r.data : undefined;
});

/** Models often emit 0 for "not planned yet"; coerce to undefined so parsing does not fail. */
export const optionalPositiveChapter = z.preprocess((val): unknown => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'number' || !Number.isFinite(val)) return val;
  if (val <= 0) return undefined;
  return val;
}, z.number().int().positive().optional());

const arrayOrEmpty = (val: unknown): unknown => {
  if (val === null || val === undefined) return [];
  return val;
};

const objectArrayOrEmpty = (
  val: unknown,
  normalize: (item: Record<string, unknown>) => Record<string, unknown> | null,
): unknown => {
  if (val === null || val === undefined) return [];
  if (!Array.isArray(val)) return val;
  const out: Record<string, unknown>[] = [];
  for (const item of val) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const normalized = normalize(item as Record<string, unknown>);
    if (normalized) out.push(normalized);
  }
  return out;
};

const normalizeNamedUpdateFields = (item: Record<string, unknown>): Record<string, unknown> | null => {
  if (typeof item.action !== 'string') return null;
  if (typeof item.name !== 'string' || !item.name.trim()) return null;
  return {
    ...item,
    fields: item.fields && typeof item.fields === 'object' && !Array.isArray(item.fields) ? item.fields : {},
  };
};

const normalizeThreadUpdate = (item: Record<string, unknown>): Record<string, unknown> | null => {
  const title = typeof item.title === 'string' && item.title.trim()
    ? item.title
    : typeof item.description === 'string' && item.description.trim()
      ? item.description
      : typeof item.name === 'string' && item.name.trim()
        ? item.name
        : undefined;
  if (!title) return null;
  if (typeof item.action === 'string') return { ...item, title };
  return { ...item, action: 'create', title };
};

const normalizeCanonFactProposal = (item: Record<string, unknown>): Record<string, unknown> | null => {
  const fact = typeof item.fact === 'string' && item.fact.trim()
    ? item.fact
    : typeof item.description === 'string' && item.description.trim()
      ? item.description
      : undefined;
  if (!fact) return null;
  return {
    ...item,
    topic: typeof item.topic === 'string' && item.topic.trim() ? item.topic : 'Sự kiện chương',
    fact,
    importance: typeof item.importance === 'string' ? item.importance : 'medium',
  };
};

const normalizeExtractorOutput = (val: unknown): unknown => {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
  const obj = val as Record<string, unknown>;
  return {
    ...obj,
    newCanonFacts: obj.newCanonFacts ?? obj.canonFacts,
  };
};

export const CharacterUpdateSchema = z.object({
  action: z.enum(['create', 'update']),
  targetId: optionalUuidFromUnknown,
  name: z.string().min(1),
  fields: z.object({
    currentRealm: z.string().optional(),
    status: z.enum(['alive', 'dead', 'missing', 'unknown']).optional(),
    bloodlines: z.array(z.string()).optional(),
    faction: z.string().optional(),
    shortTraits: z.array(z.string()).optional(),
  }).partial(),
  intentionalRegression: z.boolean().optional(),
});

export const CanonFactProposalSchema = z.object({
  topic: z.string().min(1).max(120),
  fact: z.string().min(1).max(800),
  // 'critical' included: extractor may propose critical-importance facts for operator review.
  importance: z.enum(IMPORTANCE_LEVELS),
  visibility: z.enum(['public', 'restricted', 'secret']).default('restricted'),
  knownBy: z.array(z.string()).default([]),
  validUntilChapter: optionalPositiveChapter,
});

export const ThreadUpdateSchema = z.object({
  action: z.enum(['create', 'update', 'resolve']),
  targetId: optionalUuidFromUnknown,
  title: z.string(),
  state: z.enum(['open', 'partial', 'resolved']).optional(),
  plannedResolutionChapter: optionalPositiveChapter,
});

export const TimelineEventSchema = z.object({
  description: z.string().min(1).max(500),
  charactersInvolved: z.array(z.string()).optional(),
  significance: z.enum(['minor', 'major', 'pivotal']).default('minor'),
});

export const FactionStatusEnum = z.enum(['active', 'destroyed', 'hidden', 'absorbed', 'unknown']);

/**
 * Models often emit free-form labels for ideology/powerLevel; we treat them as
 * opaque short strings rather than enums so the schema does not reject novel
 * but valid descriptions (e.g. "tà phái mạnh nhất Đông Vực").
 */
export const FactionUpdateSchema = z.object({
  action: z.enum(['create', 'update']),
  targetId: optionalUuidFromUnknown,
  name: z.string().min(1).max(120),
  fields: z.object({
    type: z.string().max(60).optional(),
    ideology: z.string().max(400).optional(),
    powerLevel: z.string().max(120).optional(),
    status: FactionStatusEnum.optional(),
    knownMembers: z.array(z.string()).max(50).optional(),
    alliances: z.array(z.string()).max(30).optional(),
    enemies: z.array(z.string()).max(30).optional(),
    notes: z.string().max(800).optional(),
  }).partial(),
});

/** Indices into a plan list (turning points / expected changes). Dedup, drop negatives/non-ints. */
export const planIndexArray = z
  .array(z.unknown())
  .default([])
  .transform((vals) => {
    const out: number[] = [];
    for (const v of vals) {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && !out.includes(v)) out.push(v);
    }
    return out;
  });

const ExtractorOutputObjectSchema = z.object({
  characterUpdates: z.preprocess((val) => objectArrayOrEmpty(val, normalizeNamedUpdateFields), z.array(CharacterUpdateSchema).max(20)),
  newCanonFacts: z.preprocess((val) => objectArrayOrEmpty(val, normalizeCanonFactProposal), z.array(CanonFactProposalSchema).max(15)),
  threadUpdates: z.preprocess((val) => objectArrayOrEmpty(val, normalizeThreadUpdate), z.array(ThreadUpdateSchema).max(15)),
  newTimelineEvents: z.preprocess(arrayOrEmpty, z.array(TimelineEventSchema).max(20)),
  // Backward-compatible: older extractor responses without factionUpdates default to [].
  factionUpdates: z.preprocess((val) => objectArrayOrEmpty(val, normalizeNamedUpdateFields), z.array(FactionUpdateSchema).max(10)).default([]),
  seedsResolvedThisChapter: z
    .preprocess(arrayOrEmpty, z
    .array(z.unknown())
    .max(10)
    .transform((arr): string[] => {
      const out: string[] = [];
      for (const x of arr) {
        if (typeof x !== 'string') continue;
        const t = x.trim();
        const r = z.string().uuid().safeParse(t);
        if (r.success) out.push(r.data);
      }
      return out;
    })),
  turningPointsCompleted: planIndexArray,
  arcChangesCompleted: planIndexArray,
});

export const ExtractorOutputSchema = z.preprocess(normalizeExtractorOutput, ExtractorOutputObjectSchema);

export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;

export const EXTRACTOR_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    characterUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update'] },
          targetId: { type: 'string' },
          name: { type: 'string' },
          fields: {
            type: 'object',
            properties: {
              currentRealm: { type: 'string' },
              status: { type: 'string', enum: ['alive', 'dead', 'missing', 'unknown'] },
              bloodlines: { type: 'array', items: { type: 'string' } },
              faction: { type: 'string' },
              shortTraits: { type: 'array', items: { type: 'string' } },
            },
          },
          intentionalRegression: { type: 'boolean' },
        },
        required: ['action', 'name', 'fields'],
      },
    },
    newCanonFacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          fact: { type: 'string' },
          importance: { type: 'string', enum: [...IMPORTANCE_LEVELS] },
          visibility: { type: 'string', enum: ['public', 'restricted', 'secret'] },
          knownBy: { type: 'array', items: { type: 'string' } },
          validUntilChapter: { type: 'integer' },
        },
        required: ['topic', 'fact', 'importance'],
      },
    },
    threadUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update', 'resolve'] },
          targetId: { type: 'string' },
          title: { type: 'string' },
          state: { type: 'string', enum: ['open', 'partial', 'resolved'] },
          plannedResolutionChapter: { type: 'integer' },
        },
        required: ['action', 'title'],
      },
    },
    newTimelineEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          charactersInvolved: { type: 'array', items: { type: 'string' } },
          significance: { type: 'string', enum: ['minor', 'major', 'pivotal'] },
        },
        required: ['description'],
      },
    },
    factionUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update'] },
          targetId: { type: 'string' },
          name: { type: 'string' },
          fields: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              ideology: { type: 'string' },
              powerLevel: { type: 'string' },
              status: { type: 'string', enum: ['active', 'destroyed', 'hidden', 'absorbed', 'unknown'] },
              knownMembers: { type: 'array', items: { type: 'string' } },
              alliances: { type: 'array', items: { type: 'string' } },
              enemies: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
            },
          },
        },
        required: ['action', 'name', 'fields'],
      },
    },
    seedsResolvedThisChapter: {
      type: 'array',
      items: { type: 'string' },
    },
    turningPointsCompleted: {
      type: 'array',
      items: { type: 'integer', minimum: 0 },
    },
    arcChangesCompleted: {
      type: 'array',
      items: { type: 'integer', minimum: 0 },
    },
  },
  // factionUpdates is optional in the wire schema (defaults to []) for backward compatibility.
  required: ['characterUpdates', 'newCanonFacts', 'threadUpdates', 'newTimelineEvents', 'seedsResolvedThisChapter'],
};
