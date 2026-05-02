---
type: error
---

# Error: Validation Failure

## Trigger

[[validators/deterministic-runner]] OR [[agents/llm-validator]] produces a finding with `severity = 'high'` or `severity = 'critical'` during the validation stages of [[flows/chapter-generation-flow]].

## Severity Handling

| Severity | Who Detects | Action Taken |
|----------|------------|--------------|
| `low` | Deterministic runner or LLM validator | [[agents/auto-fixer]] triggered — max 1 attempt |
| `medium` | Deterministic runner or LLM validator | [[agents/auto-fixer]] triggered — max 1 attempt |
| `high` | Deterministic runner or LLM validator | Generation escalated to `safe` mode; chapter **not** marked `completed`; paused for human review |
| `critical` | Deterministic runner (blocking checks) | Generation stopped immediately; chapter `failed`; no auto-fixer attempted |

## Effect

- For `high`/`critical`: chapter status → NOT `completed`; effectively `failed` or `paused`
- Generation mode auto-escalated to `safe` if not already in `safe` mode
- Finding persisted to [[database/tables/validations]] with severity + issue details
- [[jobs/job-high-stakes-review]] may be enqueued if `shouldRunReviewer()` returns `true` — see [[errors/error-high-stakes-escalation]]

## AutoFixer Behaviour (low/medium only)

- [[agents/auto-fixer]] rewrites chapter content to address all listed issues
- `AUTO_FIX_MAX_ATTEMPTS = 1` — exactly one rewrite attempt
- `AUTO_FIX_TRIGGER_SEVERITIES = ['low', 'medium']`
- If auto-fix succeeds (validator re-run passes): generation continues to canon extraction stage
- If auto-fix output still fails or severity is `high`/`critical`: auto-fixer is **skipped entirely** and generation pauses

## Related

- [[validators/deterministic-runner]]
- [[agents/llm-validator]]
- [[agents/auto-fixer]]
- [[database/tables/validations]]
- [[errors/error-generation-blocked]] — distinct: fired pre-write at planning stage
- [[errors/error-high-stakes-escalation]] — async follow-up for critical/arc-end chapters
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
