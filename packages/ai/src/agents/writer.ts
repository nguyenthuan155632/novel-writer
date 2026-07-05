import { GENERATION_CONFIG, modelFor, type EntryState, type GenreDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { writerPromptV2 } from '../prompts/writer.v2.ts';

export interface WriterDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export type ChapterGenerationMode = "single_pass" | "slot_based";

export interface WriterInput {
  serializedContext: string;
  cacheKey: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
  consistentChronology?: string[];
  entryState?: EntryState;
  chapterTailBridge?: string;
  emotionalArc?: string[];
  parallelThreads?: string[];
}

export function decideChapterGenerationMode(input: {
  packetHighStakes: boolean;
  isFirstChapterOfArc: boolean;
  isLastChapterOfArc: boolean;
  override?: string | null;
}): ChapterGenerationMode {
  if (input.override === "slot_based") return "slot_based";
  if (input.override === "single_pass") return "single_pass";
  return input.packetHighStakes || input.isFirstChapterOfArc || input.isLastChapterOfArc
    ? "slot_based"
    : "single_pass";
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
      consistentChronology: input.consistentChronology,
      entryState: input.entryState,
      chapterTailBridge: input.chapterTailBridge,
      emotionalArc: input.emotionalArc,
      parallelThreads: input.parallelThreads,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? modelFor('writer'),
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
    const title = normalizeGeneratedTitle((lines[0] ?? '').trim() || 'Vô đề');
    const content = normalizeGeneratedContent(lines.slice(1).join('\n').trim());
    return { title, content };
  }
  return {
    title: normalizeGeneratedTitle(match[1]!.trim()),
    content: normalizeGeneratedContent(match[2]!.trim()),
  };
}

function normalizeGeneratedTitle(title: string): string {
  return title
    .replace(/^#+\s*/, '')
    .replace(/^title\s*:\s*/i, '')
    .replace(/^ch(?:ươ|ư)ng\s+\d+\s*[:\-–—]\s*/i, '')
    .trim() || 'Vô đề';
}

function normalizeGeneratedContent(content: string): string {
  return content
    .replace(/\n+\s*\*?\s*Hết chương\s+\d+\s*\*?\s*$/i, '')
    .trim();
}
