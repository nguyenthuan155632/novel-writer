# Novel graph — errors

## error-budget-exceeded

`errors/error-budget-exceeded.md`

---
type: error
---



Error: Budget Exceeded Trigger
`checkAgainstCaps()` in [[modules/budget-guard]] (API side) or `packages/core/src/policy/budget-guardrails.ts` (worker side) returns `state = 'breach'` when accumulated LLM spend reaches a hard cap.
Checked at **two points**:
1. **Pre-enqueue** (API): [[modules/budget-guard]] blocks the HTTP request before the job is even queued
2. **Mid-pipeline** (Worker): `checkAgainstCaps()` evaluated during generation; job fails if breach detected



Error: Budget Exceeded Hard Caps
| Scope | Default Limit |
|-------|--------------|
| Per-chapter | $0.05 |
| Daily (rolling) | $5.00 |
| Monthly (rolling) | $50.00 |
Per-story overrides are possible via [[database/tables/story-settings]], loaded with `getEffectiveConfig(storyId, provider)`.



Error: Budget Exceeded Effect
- Chapter generation blocked before it starts (API pre-check) — HTTP 402 returned to caller
- OR chapter job fails mid-pipeline (worker check) — chapter status set to `failed`
- [[database/tables/chapters]] — `status = 'failed'`, `failureReason` field populated
- No further LLM calls are made after the breach is detected



Error: Budget Exceeded Logged To
- [[database/tables/llm-calls]] — all prior LLM costs for the current period are tracked here; the rollup is what triggers the cap
- [[database/tables/chapters]] — `failureReason` field



Error: Budget Exceeded Recovery
- Wait for the daily/monthly cap period to reset (rolling window)
- Increase per-story budget overrides in [[database/tables/story-settings]]
- Switch to a cheaper model via `PUT /api/admin/models` (→ [[routes/admin]])
- Reduce context window sizes in `story_settings` to lower token usage per call



Error: Budget Exceeded Related
- [[modules/budget-guard]] — API-side pre-enqueue check
- [[modules/cost-tracker]] — accumulates rolling costs into `story_costs`
- [[database/tables/llm-calls]] — source of truth for spend data
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]

---

## error-canon-conflict

`errors/error-canon-conflict.md`

---
type: error
---



Error: Canon Conflict Trigger
[[modules/conflict-detector]] identifies a conflict between a proposed canon update (extracted by [[agents/canon-extractor]]) and existing facts already stored in the database. Fired inside [[modules/canon-merger]] during the memory stage of [[flows/chapter-generation-flow]].



Error: Canon Conflict Conflict Types
| Type | Behaviour |
|------|-----------|
| **Blocking conflict** | Chapter completion halted; conflicting update staged to `pending_canon_updates` with `status = 'pending'`; chapter status → `paused_pending_updates` |
| **Warning conflict** | Logged and staged to `pending_canon_updates`; chapter may still complete but human review required |
| **Clean update** | Applied directly to canon tables (in `auto` merge mode with no conflicts) |



Error: Canon Conflict Effect
- [[database/tables/chapters]] — `status = 'paused_pending_updates'` (blocking) or remains completing (warning)
- [[database/tables/pending-canon-updates]] — conflicting update staged with `conflictDetails` populated
- Human must approve or reject via `PUT /api/stories/:storyId/pending-updates/:id` (→ [[routes/pending-updates]])
- No facts are written directly to canon tables while a conflict is pending



Error: Canon Conflict Created By
- [[modules/canon-merger]] — orchestrates the merge decision and routes conflicting updates
- [[modules/conflict-detector]] — computes conflict type and severity by comparing proposed data against existing canon



Error: Canon Conflict Resolution
1. Human reviews staged update at [[routes/pending-updates]]
2. **Approve** → update applied to canon tables ([[database/tables/canon-facts]], [[database/tables/characters]], etc.); chapter can resume/complete
3. **Reject** → update discarded; chapter may need partial regeneration



Error: Canon Conflict Related
- [[database/tables/pending-canon-updates]]
- [[database/tables/canon-facts]]
- [[agents/canon-extractor]]
- [[modules/canon-merger]]
- [[modules/conflict-detector]]
- [[flows/chapter-generation-flow]]

---

## error-generation-blocked

`errors/error-generation-blocked.md`

---
type: error
---



Error: Generation Blocked Trigger
[[validators/deterministic-runner]] returns `blocking = true` for one or more checks at the **pre-write** (planning) stage. This happens before [[agents/writer]] runs — it catches problems in the generated `ChapterPacket` rather than in the prose itself.



Error: Generation Blocked Blocking Checks (severity = critical)
| Check | Condition |
|-------|-----------|
| [[validators/check-dead-character]] | Chapter packet references a character whose `status = 'dead'` in the DB |
| [[validators/check-realm-jump]] | Packet implies a cultivation realm jump without a valid justification (cultivation/martial genres only) |
Other `high` severity checks (locked-fact, forbidden-move, word-count) can also contribute to a block if they accumulate, but `critical` checks are the primary blocking path.



Error: Generation Blocked Effect
1. [[validators/packet-auditor]] intercepts the blocking result and requests packet regeneration from [[agents/packet-generator]] — **maximum 1 retry**
2. If the regenerated packet also fails deterministic checks → job marks chapter `status = 'failed'` permanently
3. Failure details stored in [[database/tables/validations]]
4. [[database/tables/chapters]] → `status = 'failed'`, `failureReason` populated



Error: Generation Blocked Distinction from Validation Failure
| | Generation Blocked | Validation Failure |
|-|-------------------|--------------------|
| **Stage** | Pre-write (planning) | Post-write (prose) |
| **What's blocked** | The `ChapterPacket` | The written chapter content |
| **Recovery** | Packet regeneration (1 retry) | Auto-fix prose (1 retry, low/medium only) |
| **Permanent fail** | Yes, after 1 retry | Yes, for high/critical |



Error: Generation Blocked Related
- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]
- [[agents/packet-generator]]
- [[database/tables/validations]]
- [[database/tables/chapters]]
- [[errors/error-validation-failure]]
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]

---

## error-high-stakes-escalation

`errors/error-high-stakes-escalation.md`

---
type: error
---



Error: High-Stakes Escalation Trigger
`shouldRunReviewer()` from `packages/core/src/policy/high-stakes-triggers.ts` returns `true` at the end of [[jobs/job-generate-chapter]] (after the chapter has been written and validated).



Error: High-Stakes Escalation Causes
| Cause | Condition |
|-------|-----------|
| Critical severity finding | LLM validator returned `severity = 'critical'` during [[flows/validation-flow]] |
| Arc-end chapter | The chapter number is the last chapter in its arc |
| Arc-start chapter | The chapter is the first of a new arc |
| Manual trigger | Human requests review via `POST /api/stories/:storyId/chapters/:num/review` (→ [[routes/reviews]]) |



Error: High-Stakes Escalation Effect
- [[jobs/job-high-stakes-review]] enqueued **asynchronously** (fire-and-forget) at the end of [[jobs/job-generate-chapter]]
- The chapter itself **is still completed** before the review runs — this is a post-completion check, not a blocking one
- [[agents/high-stakes-reviewer]] runs the deep review
- Result stored in [[database/tables/high-stakes-reviews]] with `{ approve, concerns, recommendedActions }`
- If reviewer does **not** approve: generation mode may auto-escalate to `safe` for subsequent chapters



Error: High-Stakes Escalation Timeline
```
chapter generation → chapter completed → HighStakesReview enqueued (async)
                                                ↓
                                    high-stakes-review job picked up
                                                ↓
                                    HighStakesReviewerAgent runs
                                                ↓
                                    Result in high_stakes_reviews table
```
This is a non-blocking review. The next chapter in a batch may already be queued by the time the review completes.



Error: High-Stakes Escalation Related
- [[jobs/job-high-stakes-review]]
- [[agents/high-stakes-reviewer]]
- [[database/tables/high-stakes-reviews]]
- [[errors/error-validation-failure]] — critical severity is one trigger cause
- [[flows/chapter-generation-flow]]
- [[flows/validation-flow]]

---

## error-validation-failure

`errors/error-validation-failure.md`

---
type: error
---



Error: Validation Failure Trigger
[[validators/deterministic-runner]] OR [[agents/llm-validator]] produces a finding with `severity = 'high'` or `severity = 'critical'` during the validation stages of [[flows/chapter-generation-flow]].



Error: Validation Failure Severity Handling
| Severity | Who Detects | Action Taken |
|----------|------------|--------------|
| `low` | Deterministic runner or LLM validator | [[agents/auto-fixer]] triggered — max 1 attempt |
| `medium` | Deterministic runner or LLM validator | [[agents/auto-fixer]] triggered — max 1 attempt |
| `high` | Deterministic runner or LLM validator | Generation escalated to `safe` mode; chapter **not** marked `completed`; paused for human review |
| `critical` | Deterministic runner (blocking checks) | Generation stopped immediately; chapter `failed`; no auto-fixer attempted |



Error: Validation Failure Effect
- For `high`/`critical`: chapter status → NOT `completed`; effectively `failed` or `paused`
- Generation mode auto-escalated to `safe` if not already in `safe` mode
- Finding persisted to [[database/tables/validations]] with severity + issue details
- [[jobs/job-high-stakes-review]] may be enqueued if `shouldRunReviewer()` returns `true` — see [[errors/error-high-stakes-escalation]]



Error: Validation Failure AutoFixer Behaviour (low/medium only)
- [[agents/auto-fixer]] rewrites chapter content to address all listed issues
- `AUTO_FIX_MAX_ATTEMPTS = 1` — exactly one rewrite attempt
- `AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']`
- If auto-fix succeeds (validator re-run passes): generation continues to canon extraction stage
- If auto-fix output still fails or severity is `high`/`critical`: auto-fixer is **skipped entirely** and generation pauses



Error: Validation Failure Related
- [[validators/deterministic-runner]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[database/tables/validations]]
- [[errors/error-generation-blocked]] — distinct: fired pre-write at planning stage
- [[errors/error-high-stakes-escalation]] — async follow-up for critical/arc-end chapters
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]

---
