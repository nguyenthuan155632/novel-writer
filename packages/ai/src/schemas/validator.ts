import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const LlmValidatorIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
});

export const LlmValidatorOutputSchema = z.object({
  pass: z.boolean(),
  issues: z.array(LlmValidatorIssueSchema),
  summary: z.string(),
});

export type LlmValidatorIssue = z.infer<typeof LlmValidatorIssueSchema>;
export type LlmValidatorOutput = z.infer<typeof LlmValidatorOutputSchema>;

export const llmValidatorJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'issues', 'summary'],
  properties: {
    pass: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'severity', 'message'],
        properties: {
          code: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          message: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
};