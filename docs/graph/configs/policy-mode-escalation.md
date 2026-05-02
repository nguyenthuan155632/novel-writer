---
type: policy
source: packages/core/src/policy/mode-escalation.ts
---

# Policy: Mode Escalation

**Type:** Policy Module  
**Source:** `packages/core/src/policy/mode-escalation.ts`

## Responsibility
Resolves the effective generation mode for a given chapter, potentially escalating from `semi_auto` or `full_auto` to `safe` based on arc boundaries, first-chapter status, and blocking canon conflicts. Implements the auto-escalation rules gated by the `AUTO_ESCALATE_TO_SAFE_MODE` master switch in [[configs/config-long-form]].

## Function Signature

```typescript
resolveEffectiveMode(
  ctx:  ModeContext,
  deps: ModeEscalationDeps
): Promise<{ mode: Mode; reasons: string[] }>
```

### Types

```typescript
type Mode = 'safe' | 'semi_auto' | 'full_auto';

interface ModeContext {
  storyId:       string;
  chapterNumber: number;
  userMode:      Mode;
}

interface ArcBoundary {
  startChapter: number | null;
  endChapter:   number | null;
}

interface ModeEscalationDeps {
  getArcBoundaryForChapter(storyId: string, chapterNumber: number): Promise<ArcBoundary | null>;
  hasBlockingPendingUpdates(storyId: string): Promise<boolean>;
}
```

`ModeEscalationDeps` is an interface to abstract DB queries — inject stubs in tests.

## Logic

```
if userMode === 'safe' OR AUTO_ESCALATE_TO_SAFE_MODE === false:
  → return { mode: userMode, reasons: [] }   // short-circuit; no DB queries

if chapterNumber === 1:
  → reasons.push('first_chapter')

arc = getArcBoundaryForChapter(storyId, chapterNumber)
if arc.startChapter === chapterNumber: → reasons.push('arc_start')
if arc.endChapter === chapterNumber:   → reasons.push('arc_end')

if hasBlockingPendingUpdates(storyId): → reasons.push('blocking_pending')

if reasons.length > 0: → return { mode: 'safe', reasons }
else:                  → return { mode: userMode, reasons: [] }
```

### Escalation Trigger Summary

| Condition | `reasons` entry |
|---|---|
| Chapter 1 of the story | `'first_chapter'` |
| First chapter of an arc | `'arc_start'` |
| Last chapter of an arc | `'arc_end'` |
| Blocking `pending_canon_updates` exist for the story | `'blocking_pending'` |

## Depends on
- [[configs/config-long-form]] — reads `AUTO_ESCALATE_TO_SAFE_MODE` as the global master switch
- [[packages/package-core]]

## Used by
- [[jobs/job-generate-chapter]] — calls `resolveEffectiveMode()` before determining the approval flow and batch size
- [[jobs/job-generate-batch]] — uses the resolved mode to select the correct batch size from [[configs/config-generation]]

## Related flows
- [[modules/canon-merger]] — creates blocking `pending_canon_updates` entries for high-conflict canon facts; their presence triggers the `'blocking_pending'` escalation reason
- [[configs/config-generation]] — carries the `AUTO_ESCALATE_TO_SAFE_MODE` sub-object with per-condition boolean flags (overlapping concept; this policy reads the single boolean master switch from `LONG_FORM_CONFIG`)

## Notes
- **Short-circuit optimisation**: when `userMode === 'safe'` or the master switch is `false`, the function returns immediately without making any DB calls. This avoids unnecessary Postgres round-trips on the most conservative mode.
- Setting `AUTO_ESCALATE_TO_SAFE_MODE: false` in a per-story `longForm` override (via `story_settings.overrides`) completely disables all escalation for that story, giving the author full control.
- The `reasons` array is non-empty only when escalation occurs. Callers should log or surface it so authors understand why their chosen mode was overridden.
- `ModeEscalationDeps` as an injected interface allows unit tests to use synchronous stubs, avoiding real Postgres connections.
