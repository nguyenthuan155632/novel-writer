import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const ArcSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().min(3).max(120),
  premise: z.string().min(40).max(800),
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  expectedChanges: z.array(z.string().min(10).max(200)).min(1).max(8),
  seedsToResolveInArc: z.array(z.string().min(3).max(120)).optional(),
}).refine((a) => a.endChapter > a.startChapter);

export const ArcPlannerOutputSchema = z.object({
  arcs: z.array(ArcSchema).min(2).max(5),
  notes: z.string().max(800).optional(),
});

export type ArcPlannerOutput = z.infer<typeof ArcPlannerOutputSchema>;

export const ARC_PLANNER_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['arcs'],
  additionalProperties: false,
  properties: {
    arcs: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['index', 'title', 'premise', 'startChapter', 'endChapter', 'expectedChanges'], additionalProperties: false, properties: { index: { type: 'integer', minimum: 0 }, title: { type: 'string' }, premise: { type: 'string' }, startChapter: { type: 'integer', minimum: 1 }, endChapter: { type: 'integer', minimum: 1 }, expectedChanges: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 }, seedsToResolveInArc: { type: 'array', items: { type: 'string' } } } } },
    notes: { type: 'string' },
  },
};