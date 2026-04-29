# Runbook

Procedures for the most common breakages and ops tasks.

## Daily ops

- Check `/admin` for: cache hit rate (expect >70% on HOT after warm-up), $/chapter (expect <$0.02), pending canon backlog (drain weekly)
- Check Redis depth: `redis-cli -u $REDIS_URL llen bull:generate-chapter:waiting`

## Common issues

### "All chapters paused with `paused_pending_updates`"

Cause: canon merger flagged blocking conflicts in mode `safe`.
Fix:
1. Visit `/stories/:id/pending` → review each row
2. Approve / reject — merger resolves and unpauses on next chapter

### "Budget breach blocking enqueue"

Cause: per-day or per-month cap hit.
Fix: either raise caps in `/stories/:id/settings` (override `budget.PER_STORY_DAILY_CAP_USD`) or wait until window rolls.

### "HOT cache hit rate is low after editing bible"

Expected: editing bible bumps `version`, invalidates HOT for the next chapter only. Steady state should recover within 1 chapter.

### "LLM validator failing voice_drift constantly"

Likely the writer is missing style anchors. Add or refresh style few-shots: `/stories/:id/bible/few-shots`.

### "Worker stuck on stale job"

```bash
redis-cli -u $REDIS_URL del bull:generate-chapter:active
# then restart worker
pnpm --filter @novel/worker dev
```

### "Migration failed mid-deploy"

Drizzle migrations are non-transactional by default. Check `__drizzle_migrations` table for the last applied row, fix the offending migration file, re-run `pnpm --filter @novel/db migrate`.

## Recovery

### Re-derive arc rolling summary

```bash
# Enqueue a refresh job manually
pnpm --filter @novel/worker exec node -e "
  import('./src/jobs/refresh-arc-summary.js').then(m => m.enqueueRefreshArcSummary({ storyId: 'STORY_ID', arcId: 'ARC_ID' }));
"
```

### Replay a failed chapter

1. Find the failed `chapter_generation_attempts` row
2. Read the `context_packet_id` to verify input was correct
3. `POST /stories/:id/chapters/:chapterNumber/regenerate` (uses cached HOT/WARM if `bible.version` and `arc.summary_version` unchanged)

### Export a story (offline backup)

UI: story page → "Export Markdown" / "Export EPUB"
For ≥200 chapters, use the queued path; output lands in `EXPORT_OUTPUT_DIR` on the worker.

## Cost spike investigation

1. `/admin` → cost rolling 7d → identify spike day
2. `/stories/:id/costs` → break down by agent
3. If `high_stakes_reviewer` dominates, check arc-end frequency in `LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END`
4. If `writer` dominates, check chapter word counts via `/stories/:id/timeline` — runaway chapters indicate `MAX_OUTPUT_TOKENS` may need lowering