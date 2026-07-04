/**
 * Live LLM smoke test for bible generation.
 *
 * USAGE:
 *   pnpm --filter @novel/api tsx scripts/smoke-bible.ts <storyId>
 *
 * Reads OPENAI_COMPATIBLE_API_KEY, OPENAI_COMPATIBLE_BASE_URL, and DATABASE_URL from env.
 * This script will spend real credits. Run only when you intend to.
 */
import { generateBible } from '@novel/ai/agents/bible-generator';
import '@novel/ai/prompts/bible-generator.v2';
import { OpenAICompatibleProvider } from '@novel/ai/providers/openai-compatible';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import { modelFor } from '@novel/core';

const storyId = process.argv[2];
if (!storyId) {
  console.error('Usage: tsx scripts/smoke-bible.ts <storyId>');
  process.exit(1);
}
if (!process.env.OPENAI_COMPATIBLE_API_KEY) {
  console.error('OPENAI_COMPATIBLE_API_KEY not set');
  process.exit(1);
}
if (!process.env.OPENAI_COMPATIBLE_BASE_URL) {
  console.error('OPENAI_COMPATIBLE_BASE_URL not set');
  process.exit(1);
}

const db = getDb();
const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
if (!story) { console.error('story not found'); process.exit(1); }

const provider = new LoggedLLMProvider({
  inner: new OpenAICompatibleProvider({
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
    baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
  }),
  recordCall: makeDrizzleRecorder(db),
});

console.log(`generating bible for ${story.title} using ${modelFor('bible_generator')}...`);
const result = await generateBible({
  provider,
  model: modelFor('bible_generator'),
  input: {
    premise: story.premise,
    genre: story.genre,
    tone: story.tone ?? null,
    target_chapter_count: story.targetChapterCount,
  },
  storyId: story.id,
});
console.log('OK. Tokens:', result.usage);
console.log('--- compact_summary preview ---');
console.log(result.bible.compact_summary.slice(0, 200) + '...');
process.exit(0);
