import { GENERATION_CONFIG, modelFor, type GenreDef } from "@novel/core";
import type { LLMProvider } from "../providers/types.ts";
import { parseTitleAndContent } from "./writer.ts";
import { polishPassPromptV1 } from "../prompts/polish-pass.v1.ts";

export interface PolishPassDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface PolishPassInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  hints: string[];
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
}

export interface PolishPassResult {
  title: string;
  content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class PolishPassAgent {
  constructor(private readonly deps: PolishPassDeps) {}

  async polish(input: PolishPassInput): Promise<PolishPassResult> {
    const built = polishPassPromptV1.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      hints: input.hints,
      genreDef: input.genreDef,
    } as Record<string, unknown>);

    const model = this.deps.model ?? modelFor("polish_pass");
    const res = await this.deps.provider.complete({
      model,
      messages: [
        { role: "system", content: built.system },
        { role: "user", content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: polishPassPromptV1.agentRole,
        promptVersion: polishPassPromptV1.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return { title, content, usage: res.usage, cost: 0 };
  }
}
