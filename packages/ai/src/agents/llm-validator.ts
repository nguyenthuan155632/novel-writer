import { GENERATION_CONFIG, MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { getPrompt, type DualPromptTemplate } from '../prompts/registry.ts';
import '../prompts/llm-validator.v1.ts';
import { parseCompletionJsonObject } from '../parse-completion-json.ts';
import { LlmValidatorOutputSchema, llmValidatorJsonSchema } from '../schemas/validator.ts';
import type { LlmValidatorOutput } from '../schemas/validator.ts';

export interface LlmValidatorDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface LlmValidatorInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
}

export interface LlmValidatorResult {
  output: LlmValidatorOutput;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class LlmValidatorAgent {
  constructor(private readonly deps: LlmValidatorDeps) {}

  async validate(input: LlmValidatorInput): Promise<LlmValidatorResult> {
    const prompt = getPrompt('llm_validator', 'v1') as DualPromptTemplate;
    const built = prompt.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.llm_validator,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.LLM_VALIDATOR_TEMPERATURE,
      responseSchema: llmValidatorJsonSchema,
      metadata: {
        agentRole: prompt.agentRole,
        promptVersion: prompt.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const parsed = LlmValidatorOutputSchema.parse(
      parseCompletionJsonObject(res, 'llm_validator'),
    );
    return {
      output: parsed,
      usage: res.usage,
      cost: 0,
    };
  }
}
