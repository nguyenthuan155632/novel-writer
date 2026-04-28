import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const ChapterPacketSchema = z.object({
  chapterNumber: z.number().int().positive(),
  goal: z.string().min(1).max(500),
  requiredEvents: z.array(z.object({
    description: z.string().min(1).max(300),
    seedId: z.string().uuid().optional(),
  })).max(8),
  charactersPresent: z.array(z.string().min(1)).max(20),
  setting: z.string().max(300).optional(),
  conflict: z.string().min(1).max(500),
  cliffhanger: z.string().min(1).max(300),
  forbiddenMoves: z.array(z.string()).max(20),
  toneHints: z.array(z.string()).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export type ChapterPacket = z.infer<typeof ChapterPacketSchema>;

export const CHAPTER_PACKET_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['chapterNumber', 'goal', 'requiredEvents', 'charactersPresent', 'conflict', 'cliffhanger', 'forbiddenMoves'],
  properties: {
    chapterNumber: { type: 'integer' },
    goal: { type: 'string' },
    requiredEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, seedId: { type: 'string' } },
        required: ['description'],
      },
    },
    charactersPresent: { type: 'array', items: { type: 'string' } },
    setting: { type: 'string' },
    conflict: { type: 'string' },
    cliffhanger: { type: 'string' },
    forbiddenMoves: { type: 'array', items: { type: 'string' } },
    toneHints: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
};