---
type: module
source: packages/core/src/policy/mode-escalation.ts
---

# Module: Policy — Mode Escalation

**Type:** Module  
**Source:** `packages/core/src/policy/mode-escalation.ts`

## Responsibility
Resolves the *effective* generation mode — may escalate the user-requested mode to `'safe'` when special chapter conditions are detected.

## Key exports / functions
- `resolveEffectiveMode(ctx: ModeContext, deps: ModeEscalationDeps): Promise<{ mode: Mode; reasons: string[] }>`

## Types
- `Mode = 'safe' | 'semi_auto' | 'full_auto'`
- `ModeContext` — `{ storyId, chapterNumber, userMode: Mode }`
- `ArcBoundary` — `{ startChapter: number | null, endChapter: number | null }`
- `ModeEscalationDeps` — injectable deps:
  - `getArcBoundaryForChapter(storyId, chapterNumber): Promise<ArcBoundary | null>`
  - `hasBlockingPendingUpdates(storyId): Promise<boolean>`

## Escalation triggers (reasons)
| Reason | Condition |
|--------|-----------|
| `first_chapter` | `chapterNumber === 1` |
| `arc_start` | chapter is the first chapter of its arc |
| `arc_end` | chapter is the last chapter of its arc |
| `blocking_pending` | story has unresolved blocking `pending_canon_updates` |

## Behavior
- If `userMode === 'safe'` OR `AUTO_ESCALATE_TO_SAFE_MODE` is `false`: returns user's mode unchanged
- If any escalation trigger fires: returns `{ mode: 'safe', reasons: [...] }`
- If no triggers: returns original `userMode`

## Depends on
- `@novel/core` — for `LONG_FORM_CONFIG.AUTO_ESCALATE_TO_SAFE_MODE`

## Used by
- [[jobs/job-generate-chapter]] — before starting chapter generation
- [[jobs/job-generate-batch]] — before scheduling a batch

## Related database tables
- [[database/tables/pending-canon-updates]] — checked for blocking status
- [[database/tables/arcs]] — checked for arc boundaries

## Related flows
- [[flows/chapter-generation-flow]]
