import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const HighStakesReviewSchema = z.object({
  approve: z.boolean(),
  concerns: z.array(z.object({
    category: z.enum(['plot', 'voice', 'pacing', 'consistency', 'cultivation_logic', 'theme']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().min(10).max(800),
    quote: z.string().max(400).optional(),
  })).max(20),
  recommendedActions: z.array(z.object({
    action: z.enum(['rewrite_chapter', 'patch_with_auto_fixer', 'edit_canon', 'plant_followup_seed', 'no_action']),
    rationale: z.string().min(10).max(400),
  })).max(8),
});

export type HighStakesReview = z.infer<typeof HighStakesReviewSchema>;

export const HIGH_STAKES_REVIEW_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['approve', 'concerns', 'recommendedActions'],
  additionalProperties: false,
  properties: {
    approve: { type: 'boolean' },
    concerns: { type: 'array', maxItems: 20, items: { type: 'object', required: ['category', 'severity', 'description'], additionalProperties: false, properties: { category: { type: 'string', enum: ['plot', 'voice', 'pacing', 'consistency', 'cultivation_logic', 'theme'] }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, description: { type: 'string' }, quote: { type: 'string' } } } },
    recommendedActions: { type: 'array', maxItems: 8, items: { type: 'object', required: ['action', 'rationale'], additionalProperties: false, properties: { action: { type: 'string', enum: ['rewrite_chapter', 'patch_with_auto_fixer', 'edit_canon', 'plant_followup_seed', 'no_action'] }, rationale: { type: 'string' } } } },
  },
};