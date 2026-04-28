import { describe, it, expect } from 'vitest';
import { mergeOverrides } from '../src/config/effective.ts';
import { CONTEXT_CONFIG } from '../src/config/context.ts';
import { GENERATION_CONFIG } from '../src/config/generation.ts';

describe('mergeOverrides', () => {
  it('returns defaults when overrides empty', () => {
    const r = mergeOverrides({});
    expect(r.context.TOKEN_BUDGET_NORMAL).toBe(CONTEXT_CONFIG.TOKEN_BUDGET_NORMAL);
    expect(r.generation.CHAPTER_TARGET_WORDS_MIN).toBe(GENERATION_CONFIG.CHAPTER_TARGET_WORDS_MIN);
  });

  it('overrides scalar fields', () => {
    const r = mergeOverrides({
      context: { TOKEN_BUDGET_NORMAL: 9999 },
      generation: { CHAPTER_TARGET_WORDS_MAX: 5000 },
    });
    expect(r.context.TOKEN_BUDGET_NORMAL).toBe(9999);
    expect(r.generation.CHAPTER_TARGET_WORDS_MAX).toBe(5000);
    expect(r.context.RECENT_CHAPTER_SUMMARIES_COUNT).toBe(CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT);
  });

  it('deep-merges nested objects', () => {
    const r = mergeOverrides({
      generation: {
        AUTO_ESCALATE_TO_SAFE_MODE: { FIRST_CHAPTER_OF_STORY: false },
      },
    });
    expect(r.generation.AUTO_ESCALATE_TO_SAFE_MODE.FIRST_CHAPTER_OF_STORY).toBe(false);
    expect(r.generation.AUTO_ESCALATE_TO_SAFE_MODE.ON_VALIDATOR_CRITICAL).toBe(true);
  });
});