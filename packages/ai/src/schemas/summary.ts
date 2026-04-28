import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const SummaryCompactorOutputSchema = z.object({
  shortSummary: z.string().min(1).max(300),
  detailedSummary: z.string().min(1).max(2000),
  keyEvents: z.array(z.string().min(1).max(200)).max(10),
  charactersPresent: z.array(z.string().min(1)).max(20),
  moodShift: z.enum(['darker', 'lighter', 'unchanged']).optional(),
});

export type SummaryCompactorOutput = z.infer<typeof SummaryCompactorOutputSchema>;

export const SUMMARY_COMPACTOR_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['shortSummary', 'detailedSummary', 'keyEvents', 'charactersPresent'],
  properties: {
    shortSummary: { type: 'string' },
    detailedSummary: { type: 'string' },
    keyEvents: { type: 'array', items: { type: 'string' } },
    charactersPresent: { type: 'array', items: { type: 'string' } },
    moodShift: { type: 'string', enum: ['darker', 'lighter', 'unchanged'] },
  },
};
