import { EntryStateSchema } from "@novel/core";
import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const PACKET_LIMITS = {
  goal: 500,
  requiredEventDescription: 500,
  requiredEvents: 8,
  charactersPresent: 20,
  setting: 300,
  conflict: 500,
  cliffhanger: 500,
  forbiddenMoves: 20,
  toneHints: 5,
  notes: 500,
} as const;

export const ChapterPacketSchema = z.object({
  chapterNumber: z.number().int().positive(),
  goal: z.string().min(1).max(PACKET_LIMITS.goal),
  requiredEvents: z.array(z.object({
    description: z.string().min(1).max(PACKET_LIMITS.requiredEventDescription),
    seedId: z.string().uuid().optional().catch(undefined),
  })).max(PACKET_LIMITS.requiredEvents),
  charactersPresent: z.array(z.string().min(1)).max(PACKET_LIMITS.charactersPresent),
  setting: z.string().max(PACKET_LIMITS.setting).optional(),
  conflict: z.string().min(1).max(PACKET_LIMITS.conflict),
  cliffhanger: z.string().min(1).max(PACKET_LIMITS.cliffhanger),
  forbiddenMoves: z.array(z.string()).max(PACKET_LIMITS.forbiddenMoves),
  toneHints: z.array(z.string()).max(PACKET_LIMITS.toneHints).optional(),
  notes: z.string().max(PACKET_LIMITS.notes).optional(),
  entryState: EntryStateSchema.optional(),
  /**
   * §1.9 — IDs of must-include seeds that were actually incorporated.
   * Computed server-side by scanning requiredEvents seedIds after parse;
   * not emitted by the LLM (LLMs don't reliably echo arbitrary IDs).
   */
  seedsAutoEnforced: z.array(z.string()).default([]),
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