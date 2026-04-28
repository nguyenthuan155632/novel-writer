import { GENERATION_CONFIG, MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { getPrompt, type DualPromptTemplate } from '../prompts/registry.ts';
import { parseTitleAndContent } from './writer.ts';

export interface AutoFixerDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
}

export interface AutoFixerInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
  storyId: string;
  traceId: string;
}

export interface AutoFixerResult {
  title: string;
  content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class AutoFixerAgent {
  constructor(private readonly deps: AutoFixerDeps) {}

  async fix(input: AutoFixerInput): Promise<AutoFixerResult> {
    const prompt = getPrompt('auto_fixer', 'v1') as DualPromptTemplate;
    const built = prompt.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      issues: input.issues,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.auto_fixer,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: prompt.agentRole,
        promptVersion: prompt.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return {
      title,
      content,
      usage: res.usage,
      cost: 0,
    };
  }
}