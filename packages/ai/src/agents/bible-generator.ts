import type { GenreDef, PersonalityDef, StoryOptions } from "@novel/core";
import { z } from "zod";
import {
  parseCompletionJsonObject,
  withCompletionRetryRaw,
} from "../parse-completion-json.ts";
import type { LLMProvider } from "../providers/types.ts";
import {
  BibleV2Schema,
  bibleV2JsonSchema,
  type BibleV2,
} from "../schemas/bible.ts";
import "../prompts/bible-generator.v2.ts";
import { bibleGeneratorPromptV2 } from "../prompts/bible-generator.v2.ts";

export interface GenerateBibleParams {
  provider: LLMProvider;
  model: string;
  input: {
    premise: string;
    target_chapter_count: number;
    genreDef: GenreDef;
    personalityDef: PersonalityDef;
    storyOptions: StoryOptions;
  };
  traceId?: string;
  storyId?: string;
}

export interface GenerateBibleResult {
  bible: BibleV2;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
  rawContent: string;
}

const BIBLE_VALIDATION_ATTEMPTS = 3;

function responseSchemaForInput(input: GenerateBibleParams["input"]) {
  if (input.genreDef.family !== "cultivation") return bibleV2JsonSchema;

  // For cultivation stories, cultivation_system is mandatory.
  // realm_ladder stays optional in schema (prompt encourages it for all genres with progression).
  return {
    ...bibleV2JsonSchema,
    required: [
      ...new Set([...(bibleV2JsonSchema.required ?? []), "cultivation_system"]),
    ],
  };
}

export async function generateBible(
  params: GenerateBibleParams,
): Promise<GenerateBibleResult> {
  const userContent = bibleGeneratorPromptV2.render(
    params.input as unknown as Record<string, unknown>,
  );
  const responseSchema = responseSchemaForInput(params.input);

  let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let lastContent = "";
  let lastValidationError: z.ZodError | undefined;

  for (let attempt = 0; attempt < BIBLE_VALIDATION_ATTEMPTS; attempt++) {
    const res = await withCompletionRetryRaw(
      "bible_generator",
      async () => {
        return params.provider.complete({
          model: params.model,
          messages: [{ role: "user", content: userContent }],
          responseSchema,
          temperature: 0.7,
          metadata: {
            agentRole: bibleGeneratorPromptV2.agentRole,
            promptVersion: bibleGeneratorPromptV2.version,
            traceId: params.traceId,
            storyId: params.storyId,
          },
        });
      },
      3,
    );

    lastUsage = res.usage;
    lastContent = res.content;

    if (res.finishReason === "length") {
      if (attempt < BIBLE_VALIDATION_ATTEMPTS - 1) continue;
      throw new Error(
        "bible_generator: completion hit max output tokens before producing a complete bible",
      );
    }

    const raw = parseCompletionJsonObject(res, "bible_generator");
    const parsed = BibleV2Schema.safeParse(raw);
    if (parsed.success) {
      return { bible: parsed.data, usage: lastUsage, rawContent: lastContent };
    }

    lastValidationError = parsed.error;
  }

  throw (
    lastValidationError ??
    new Error("bible_generator: failed to produce a valid bible")
  );
}
