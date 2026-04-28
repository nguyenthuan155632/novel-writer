import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const CharacterUpdateSchema = z.object({
  action: z.enum(['create', 'update']),
  targetId: z.string().uuid().optional(),
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
  importance: z.enum(['low', 'medium', 'high', 'locked']),
});

export const ThreadUpdateSchema = z.object({
  action: z.enum(['create', 'update', 'resolve']),
  targetId: z.string().uuid().optional(),
  title: z.string(),
  state: z.enum(['open', 'partial', 'resolved']).optional(),
  plannedResolutionChapter: z.number().int().positive().optional(),
});

export const TimelineEventSchema = z.object({
  description: z.string().min(1).max(500),
  charactersInvolved: z.array(z.string()).optional(),
  significance: z.enum(['minor', 'major', 'pivotal']).default('minor'),
});

export const ExtractorOutputSchema = z.object({
  characterUpdates: z.array(CharacterUpdateSchema).max(20),
  newCanonFacts: z.array(CanonFactProposalSchema).max(15),
  threadUpdates: z.array(ThreadUpdateSchema).max(15),
  newTimelineEvents: z.array(TimelineEventSchema).max(20),
  seedsResolvedThisChapter: z.array(z.string().uuid()).max(10),
});

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
          importance: { type: 'string', enum: ['low', 'medium', 'high', 'locked'] },
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
    seedsResolvedThisChapter: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['characterUpdates', 'newCanonFacts', 'threadUpdates', 'newTimelineEvents', 'seedsResolvedThisChapter'],
};
