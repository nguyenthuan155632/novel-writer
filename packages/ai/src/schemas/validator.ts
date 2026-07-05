import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const LlmValidatorIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
});

const arrayOrEmpty = (val: unknown): unknown => {
  if (val === null || val === undefined) return [];
  return val;
};

const normalizeValidatorOutput = (val: unknown): unknown => {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
  const obj = val as Record<string, unknown>;
  const issues = Array.isArray(obj.issues) ? obj.issues : [];
  const hasBlockingIssue = issues.some((issue) => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) return false;
    const severity = (issue as Record<string, unknown>).severity;
    return severity === 'high' || severity === 'critical';
  });
  return {
    ...obj,
    pass: typeof obj.pass === 'boolean' ? obj.pass : !hasBlockingIssue,
    issues,
    summary: typeof obj.summary === 'string' ? obj.summary : '',
  };
};

const LlmValidatorOutputObjectSchema = z.object({
  pass: z.boolean(),
  issues: z.preprocess(arrayOrEmpty, z.array(LlmValidatorIssueSchema)),
  summary: z.string(),
});

export const LlmValidatorOutputSchema = z.preprocess(normalizeValidatorOutput, LlmValidatorOutputObjectSchema);

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
