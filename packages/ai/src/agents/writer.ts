import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { writerPromptV2 } from '../prompts/writer.v2.ts';

export interface WriterDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface WriterInput {
  serializedContext: string;
  cacheKey: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
}

export interface WriterResult {
  title: string;
  content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class WriterAgent {
  constructor(private readonly deps: WriterDeps) {}

  async write(input: WriterInput): Promise<WriterResult> {
    const built = writerPromptV2.build({
      serializedContext: input.serializedContext,
      genreDef: input.genreDef,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.writer,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: writerPromptV2.agentRole,
        promptVersion: writerPromptV2.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return { title, content, usage: res.usage, cost: 0 };
  }
}

export function parseTitleAndContent(raw: string): { title: string; content: string } {
  const match = raw.match(/^\s*TITLE:\s*(.+?)\n+([\s\S]+)$/);
  if (!match) {
    const lines = raw.split('\n');
    const title = (lines[0] ?? '').trim() || 'Vô đề';
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  }
  return { title: match[1]!.trim(), content: match[2]!.trim() };
}
