import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { BibleV2Schema, bibleV2JsonSchema, type BibleV2 } from '../schemas/bible.ts';
import '../prompts/bible-generator.v2.ts';
import { bibleGeneratorPromptV2 } from '../prompts/bible-generator.v2.ts';

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
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  rawContent: string;
}

export async function generateBible(params: GenerateBibleParams): Promise<GenerateBibleResult> {
  const userContent = bibleGeneratorPromptV2.render(params.input as unknown as Record<string, unknown>);

  let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let lastContent = '';
  const parsed = BibleV2Schema.parse(
    await withCompletionRetry(
      'bible_generator',
      async () => {
        const res = await params.provider.complete({
          model: params.model,
          messages: [{ role: 'user', content: userContent }],
          responseSchema: bibleV2JsonSchema,
          temperature: 0.7,
          metadata: {
            agentRole: bibleGeneratorPromptV2.agentRole,
            promptVersion: bibleGeneratorPromptV2.version,
            traceId: params.traceId,
            storyId: params.storyId,
          },
        });
        lastUsage = res.usage;
        lastContent = res.content;
        return res;
      },
      3,
    ),
  );
  return { bible: parsed, usage: lastUsage, rawContent: lastContent };
}
