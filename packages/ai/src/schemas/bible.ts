import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const BibleSchema = z.object({
  world_rules: z.string().min(50),
  cultivation_system: z.string().min(50),
  bloodline_system: z.string().min(50),
  style_guide: z.string().min(50),
  forbidden_rules: z.string().min(20),
  ending_direction: z.string().min(20),
  compact_summary: z.string().min(50).max(2000),
});

export type Bible = z.infer<typeof BibleSchema>;

export const bibleJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'world_rules',
    'cultivation_system',
    'bloodline_system',
    'style_guide',
    'forbidden_rules',
    'ending_direction',
    'compact_summary',
  ],
  properties: {
    world_rules: { type: 'string' },
    cultivation_system: { type: 'string' },
    bloodline_system: { type: 'string' },
    style_guide: { type: 'string' },
    forbidden_rules: { type: 'string' },
    ending_direction: { type: 'string' },
    compact_summary: { type: 'string' },
  },
};

export const POWER_SYSTEM_KINDS = [
  'cultivation', 'martial', 'ability', 'tech', 'urban',
  'historical', 'horror', 'mystery', 'system', 'reincarnation', 'mixed', 'none',
] as const;

export const BibleV2Schema = z.object({
  world_rules: z.string().min(50),
  power_system: z.string().min(50),
  power_system_kind: z.enum(POWER_SYSTEM_KINDS),
  cultivation_system: z.string().min(50).optional(),
  bloodline_system: z.string().min(50).optional(),
  style_guide: z.string().min(50),
  forbidden_rules: z.string().min(20),
  ending_direction: z.string().min(20),
  compact_summary: z.string().min(50).max(2000),
}).superRefine((bible, ctx) => {
  if (bible.power_system_kind === 'cultivation' && !bible.cultivation_system) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cultivation_system'],
      message: 'cultivation_system is required when power_system_kind=cultivation',
    });
  }
});

export type BibleV2 = z.infer<typeof BibleV2Schema>;

export const bibleV2JsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'world_rules', 'power_system', 'power_system_kind',
    'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
  ],
  properties: {
    world_rules: { type: 'string' },
    power_system: { type: 'string' },
    power_system_kind: { type: 'string', enum: [...POWER_SYSTEM_KINDS] },
    cultivation_system: { type: 'string' },
    bloodline_system: { type: 'string' },
    style_guide: { type: 'string' },
    forbidden_rules: { type: 'string' },
    ending_direction: { type: 'string' },
    compact_summary: { type: 'string' },
  },
};