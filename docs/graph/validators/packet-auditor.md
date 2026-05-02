---
type: validator
source: packages/ai/src/validators/packet-auditor.ts
---

# Validator: Packet Auditor

## Responsibility
Deterministic pre-write audit of the `ChapterPacket` before chapter writing begins. No LLM calls. Catches structural packet issues early.

## Source Evidence
`packages/ai/src/validators/packet-auditor.ts` — `auditPacket(input, ctx)`

## Checks Performed
- Dead characters referenced in packet
- Overdue seeds not addressed in packet
- Missing conflict in packet
- Missing cliffhanger in packet
- Realm jump excess in packet
- Overdue turning points missed

## Inputs
- `ChapterPacket`
- Context snapshot: characters, planted seeds, arc turning points

## Outputs
- `{ pass: boolean, issues: AuditIssue[] }`
- On fail: triggers packet regeneration (up to 1 extra attempt in pipeline)
- Updates [[database/tables/chapters]].`packetAuditStatus`

## Used By
- [[jobs/job-generate-chapter]] (Stage 3 — AUDIT)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapter-packets]]
- [[database/tables/chapters]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: validator
source: packages/ai/src/validators/packet-auditor.ts
---

# Validator: Packet Auditor

## Responsibility
Deterministic pre-write audit of ChapterPacket before writing begins. No LLM. Catches structural issues early.

## Source Evidence
`packages/ai/src/validators/packet-auditor.ts` — `auditPacket(input, ctx)`

## Checks
- Dead characters referenced in packet
- Overdue seeds not addressed
- Missing conflict in packet
- Missing cliffhanger in packet
- Realm jump excess in packet
- Overdue turning points missed

## Inputs
- `ChapterPacket`
- Context: characters, planted seeds, arc turning points

## Outputs
- `{ pass: boolean, issues: AuditIssue[] }`
- On fail: pipeline regenerates packet (up to 1 extra attempt)
- Updates [[database/tables/chapters]].packetAuditStatus

## Used By
- [[jobs/job-generate-chapter]] (Stage 3 — AUDIT)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapter-packets]]
- [[database/tables/chapters]]
