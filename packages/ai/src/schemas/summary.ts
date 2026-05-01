import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

/** LLMs often confuse “từ” (words) with character limits; clamp so the pipeline never fails. */
function clampChars(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export const SummaryCompactorOutputSchema = z.object({
  summary: z.string().min(1).transform(s => clampChars(s, 2000)),
  keyEvents: z
    .array(z.string().min(1).transform(s => clampChars(s, 200)))
    .max(10),
  charactersPresent: z.array(z.string().min(1)).max(20),
  moodShift: z.enum(['darker', 'lighter', 'unchanged']).optional(),
});

export type SummaryCompactorOutput = z.infer<typeof SummaryCompactorOutputSchema>;

export const SUMMARY_COMPACTOR_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'keyEvents', 'charactersPresent'],
  properties: {
    summary: { type: 'string', maxLength: 2000 },
    keyEvents: { type: 'array', items: { type: 'string' } },
    charactersPresent: { type: 'array', items: { type: 'string' } },
    moodShift: { type: 'string', enum: ['darker', 'lighter', 'unchanged'] },
  },
};
