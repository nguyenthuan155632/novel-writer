import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { BibleSchema, bibleJsonSchema, type Bible } from '../schemas/bible.ts';
import { getPrompt, type PromptTemplate } from '../prompts/registry.ts';
import '../prompts/bible-generator.v1.ts';
import type { BibleGeneratorInput } from '../prompts/bible-generator.v1.ts';

export interface GenerateBibleParams {
  provider: LLMProvider;
  model: string;
  input: BibleGeneratorInput;
  traceId?: string;
  storyId?: string;
}

export interface GenerateBibleResult {
  bible: Bible;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  rawContent: string;
}

export async function generateBible(params: GenerateBibleParams): Promise<GenerateBibleResult> {
  const tmpl = getPrompt('bible_generator', 'v1') as PromptTemplate;
  const userContent = tmpl.render(params.input as unknown as Record<string, unknown>);

  let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let lastContent = '';
  const parsed = BibleSchema.parse(
    await withCompletionRetry(
      'bible_generator',
      async () => {
        const res = await params.provider.complete({
          model: params.model,
          messages: [{ role: 'user', content: userContent }],
          responseSchema: bibleJsonSchema,
          temperature: 0.7,
          metadata: {
            agentRole: tmpl.agentRole,
            promptVersion: tmpl.version,
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