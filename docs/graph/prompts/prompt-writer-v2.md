---
type: prompt
source: packages/ai/src/prompts/writer.v2.ts
agentRole: writer
version: v2
promptType: DualPromptTemplate
---
# Prompt: Writer v2
**Role:** `writer` — generates chapter prose
**Type:** `DualPromptTemplate` (`build()` → `{system, user}`)
**Language:** Vietnamese system prompt
**Source:** `packages/ai/src/prompts/writer.v2.ts`
**Used by:** [[agents/writer]]
**Depends on:** [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
**Temperature:** 0.85 (see [[configs/config-generation]])
---
type: prompt
source: packages/ai/src/prompts/writer.v2.ts
agentRole: writer
version: v2
---
# Prompt: Writer v2
**Type:** DualPromptTemplate — `build()` → `{system, user}`
**Language:** Vietnamese system prompt
**Used by:** [[agents/writer]]
**Depends on:** [[prompts/contract-genre]], [[prompts/contract-personality]], [[prompts/contract-story-options]]
**Temperature:** 0.85 — [[configs/config-generation]]
## Writer v2 — Recent Changes (2026-05-05)
- XML inserts: `<genre_contract>`, `<personality_contract>`, `<story_options>`, `<parallel_threads>`, `<pending_canon>` wrapped sections
- Role frame injected from [[prompts/role-frames]]
- `entryState` + `prevChapterTailContent` available from packet
- Anti-LLM pattern guard: explicit "DO NOT ASSUME" rules in system prompt
- Genre/personality/story-options now exported as named XML blocks (not just inline text)
## Fix (2026-05-06)
The earlier note claimed XML inserts for `<genre_contract>`, `<personality_contract>`, `<story_options>`, `<pending_canon>` — these are inaccurate. The actual XML blocks in writer.v2 are:
- `<consistent_chronology>` — list block
- `<entry_state>` — structured block with location, timestamp, POV, physical/emotional state, active knowledge, immediate goal
- `<chapter_tail_bridge>` — text block
- `<emotional_arc>` — list block
- `<parallel_threads>` — list block

The contracts (genre, personality, story options) are inline text in the system prompt, not XML-tagged blocks. No `<pending_canon>` block exists in writer.v2. Also: `CREATOR_FRAME` is injected (not `WRITER_ROLE_FRAME`). Anti-LLM rules are inline in the system prompt, not separate XML.
## Correction (2026-05-06) — "Recent Changes" Section Still Lists Wrong XML Blocks
The main body "Writer v2 — Recent Changes" section (lines before the Fix append) claims XML inserts: `<genre_contract>`, `<personality_contract>`, `<story_options>`, `<parallel_threads>`, `<pending_canon>`. These are all wrong. The Fix note below correctly documents the actual 5 XML blocks. The main body section needs to be fully rewritten: the contracts are inline text (not XML), no `<pending_canon>` block exists, and `CREATOR_FRAME` (not `WRITER_ROLE_FRAME`) is the injected role frame.