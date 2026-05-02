---
type: error
---

# Error: Generation Blocked

## Trigger

[[validators/deterministic-runner]] returns `blocking = true` for one or more checks at the **pre-write** (planning) stage. This happens before [[agents/writer]] runs — it catches problems in the generated `ChapterPacket` rather than in the prose itself.

## Blocking Checks (severity = critical)

| Check | Condition |
|-------|-----------|
| [[validators/check-dead-character]] | Chapter packet references a character whose `status = 'dead'` in the DB |
| [[validators/check-realm-jump]] | Packet implies a cultivation realm jump without a valid justification (cultivation/martial genres only) |

Other `high` severity checks (locked-fact, forbidden-move, word-count) can also contribute to a block if they accumulate, but `critical` checks are the primary blocking path.

## Effect

1. [[validators/packet-auditor]] intercepts the blocking result and requests packet regeneration from [[agents/packet-generator]] — **maximum 1 retry**
2. If the regenerated packet also fails deterministic checks → job marks chapter `status = 'failed'` permanently
3. Failure details stored in [[database/tables/validations]]
4. [[database/tables/chapters]] → `status = 'failed'`, `failureReason` populated

## Distinction from Validation Failure

| | Generation Blocked | Validation Failure |
|-|-------------------|--------------------|
| **Stage** | Pre-write (planning) | Post-write (prose) |
| **What's blocked** | The `ChapterPacket` | The written chapter content |
| **Recovery** | Packet regeneration (1 retry) | Auto-fix prose (1 retry, low/medium only) |
| **Permanent fail** | Yes, after 1 retry | Yes, for high/critical |

## Related

- [[validators/deterministic-runner]]
- [[validators/packet-auditor]]
- [[agents/packet-generator]]
- [[database/tables/validations]]
- [[database/tables/chapters]]
- [[errors/error-validation-failure]]
- [[flows/validation-flow]]
- [[flows/chapter-generation-flow]]
