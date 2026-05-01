import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef, type PersonalityDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { llmValidatorPromptV2 } from '../prompts/llm-validator.v2.ts';
import { withCompletionRetry } from '../parse-completion-json.ts';
import { LlmValidatorOutputSchema, llmValidatorJsonSchema, type LlmValidatorOutput } from '../schemas/validator.ts';

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
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
}

export interface LlmValidatorResult {
  output: LlmValidatorOutput;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class LlmValidatorAgent {
  constructor(private readonly deps: LlmValidatorDeps) {}

  async validate(input: LlmValidatorInput): Promise<LlmValidatorResult> {
    const built = llmValidatorPromptV2.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      genreDef: input.genreDef,
      personalityDef: input.personalityDef,
    } as unknown as Record<string, unknown>);

    let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    const parsed = LlmValidatorOutputSchema.parse(
      await withCompletionRetry(
        'llm_validator',
        async () => {
          const res = await this.deps.provider.complete({
            model: this.deps.model ?? MODEL_CONFIG.routes.llm_validator,
            messages: [
              { role: 'system', content: built.system },
              { role: 'user', content: built.user },
            ],
            temperature: GENERATION_CONFIG.LLM_VALIDATOR_TEMPERATURE,
            responseSchema: llmValidatorJsonSchema,
            metadata: {
              agentRole: llmValidatorPromptV2.agentRole,
              promptVersion: llmValidatorPromptV2.version,
              traceId: input.traceId,
              storyId: input.storyId,
            },
          });
          lastUsage = res.usage;
          return res;
        },
        3,
      ),
    );
    return { output: parsed, usage: lastUsage, cost: 0 };
  }
}
