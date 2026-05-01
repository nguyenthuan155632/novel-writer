import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { autoFixerPromptV2 } from '../prompts/auto-fixer.v2.ts';
import { parseTitleAndContent } from './writer.ts';

export interface AutoFixerDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface AutoFixerInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
}

export interface AutoFixerResult {
  title: string; content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class AutoFixerAgent {
  constructor(private readonly deps: AutoFixerDeps) {}

  async fix(input: AutoFixerInput): Promise<AutoFixerResult> {
    const built = autoFixerPromptV2.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      issues: input.issues,
      genreDef: input.genreDef,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.auto_fixer,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: autoFixerPromptV2.agentRole,
        promptVersion: autoFixerPromptV2.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return { title, content, usage: res.usage, cost: 0 };
  }
}
