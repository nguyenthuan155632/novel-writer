import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const PlantedSeedSchema = z.object({
  seedKey: z.string().min(3).max(120),
  description: z.string().min(20).max(600),
  plantWindowStart: z.number().int().positive(),
  plantWindowEnd: z.number().int().positive(),
  payoffChapter: z.number().int().positive(),
  importance: z.enum(['minor', 'major', 'climax']),
}).refine((s) => s.plantWindowEnd >= s.plantWindowStart, {
  message: 'plantWindowEnd must be >= plantWindowStart',
});

export const ParallelThreadSchema = z.object({
  id: z.string().min(1).max(120),
  premise: z.string().min(20).max(600),
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  parentTimelineId: z.string().min(1).max(120).nullable(),
}).refine((thread) => thread.endChapter >= thread.startChapter, {
  message: 'thread endChapter must be >= startChapter',
});

export const ConvergencePointSchema = z.object({
  atChapter: z.number().int().positive(),
  threadIds: z.array(z.string().min(1).max(120)).min(1).max(8),
  synopsis: z.string().min(10).max(400),
});

export const SagaSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().min(3).max(120),
  premise: z.string().min(40).max(1200),
  startChapter: z.number().int().positive(),
  endChapter: z.number().int().positive(),
  expectedTurningPoints: z.array(z.string().min(10).max(300)).min(2).max(8),
  parallelThreads: z.array(ParallelThreadSchema).max(8).default([]),
  convergencePoints: z.array(ConvergencePointSchema).max(12).default([]),
}).refine((s) => s.endChapter > s.startChapter, {
  message: 'endChapter must be > startChapter',
});

export const SagaPlannerOutputSchema = z.object({
  sagas: z.array(SagaSchema).min(1).max(20),
  plantedSeeds: z.array(PlantedSeedSchema).min(1).max(100),
  notes: z.string().max(1000).optional(),
});

export type SagaPlannerOutput = z.infer<typeof SagaPlannerOutputSchema>;

export const SAGA_PLANNER_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['sagas', 'plantedSeeds'],
  additionalProperties: false,
  properties: {
    sagas: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        required: ['index', 'title', 'premise', 'startChapter', 'endChapter', 'expectedTurningPoints'],
        additionalProperties: false,
        properties: {
          index: { type: 'integer', minimum: 0 },
          title: { type: 'string' },
          premise: { type: 'string' },
          startChapter: { type: 'integer', minimum: 1 },
          endChapter: { type: 'integer', minimum: 1 },
          expectedTurningPoints: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8 },
        },
      },
    },
    plantedSeeds: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['seedKey', 'description', 'plantWindowStart', 'plantWindowEnd', 'payoffChapter', 'importance'],
        additionalProperties: false,
        properties: {
          seedKey: { type: 'string' },
          description: { type: 'string' },
          plantWindowStart: { type: 'integer', minimum: 1 },
          plantWindowEnd: { type: 'integer', minimum: 1 },
          payoffChapter: { type: 'integer', minimum: 1 },
          importance: { type: 'string', enum: ['minor', 'major', 'climax'] },
        },
      },
    },
    notes: { type: 'string' },
  },
};