---
type: validator-check
source: packages/ai/src/validators/deterministic/word-count.ts
---
# Check: word_count
**Severity:** high
**Logic:** Chapter word count must be within HARD_FAIL bounds (1500–4000). Rejects if outside range.
**Source:** `packages/ai/src/validators/deterministic/word-count.ts`
**Used by:** [[validators/deterministic-runner]]
**Config:** [[configs/config-generation]] — `CHAPTER_HARD_FAIL_WORDS`
---
type: validator-check
source: packages/ai/src/validators/deterministic/word-count.ts
---
# Check: word_count
**Severity:** high
Chapter word count must be within 1500–4000 words (CHAPTER_HARD_FAIL_WORDS).
**Source:** `packages/ai/src/validators/deterministic/word-count.ts`
**Config:** [[configs/config-generation]]
**Used by:** [[validators/deterministic-runner]]
