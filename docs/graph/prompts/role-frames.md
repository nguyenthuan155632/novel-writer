---
type: module
source: packages/ai/src/prompts/role-frames.ts
---

# Module: Role Frames

## Responsibility
Shared role-framing text blocks injected into prompt system messages. Provides consistent agent identity framing across all prompts.

## Source Evidence
`packages/ai/src/prompts/role-frames.ts`

## Key Exports
- `WRITER_ROLE_FRAME` — writer agent identity text
- `REVIEWER_ROLE_FRAME` — reviewer/high-stakes agent identity
- `EXTRACTOR_ROLE_FRAME` — canon extractor identity
- (others may be present)

## Used By
- [[prompts/prompt-writer-v2]] — writer system message
- [[prompts/prompt-high-stakes-reviewer-v2]]
- [[prompts/prompt-canon-extractor-v2]]
- Other v2 prompts as they adopt role frames

## Related Flows
[[flows/chapter-generation-flow]]
## Key Exports (corrected)
Actual exports from `packages/ai/src/prompts/role-frames.ts`:
- `PLANNER_FRAME` — structural planning agent identity
- `CREATOR_FRAME` — writer/creator agent identity (used in [[prompts/prompt-writer-v2]])
- `MONITOR_FRAME` — validator/monitor agent identity

Note: the file does NOT export WRITER_ROLE_FRAME, REVIEWER_ROLE_FRAME, or EXTRACTOR_ROLE_FRAME — those names are outdated placeholder references.
## Correction (2026-05-06) — Role Frame Exports Still Wrong in Main Body
Both blocks in this file still list WRITER_ROLE_FRAME, REVIEWER_ROLE_FRAME, EXTRACTOR_ROLE_FRAME as exports. The Fix note at the bottom correctly states the actual exports are PLANNER_FRAME, CREATOR_FRAME, MONITOR_FRAME. The main body and exports section need full revision to list the correct three exports and remove the outdated three.