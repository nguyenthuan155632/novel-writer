---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-faction.ts
---

# Check: unknown_faction

**Severity:** low
**Logic:** Flags Vietnamese proper-noun phrases preceded by a faction-introducing prefix (`môn phái`, `tông môn`, `tông phái`, `gia tộc`, `thế gia`, `thị tộc`, `liên minh`, `liên bang`, `vương triều`, `đế quốc`, `hoàng triều`, `tà phái`, `chính phái`, `hắc đạo`, `bạch đạo`, `thương hội`, `sơn trại`) when the name is not in the canonical [[database/tables/factions]] list (and not a known character / bloodline / location, to avoid double-flagging).
**Source:** `packages/ai/src/validators/deterministic/unknown-faction.ts`
**Reads:** [[database/tables/factions]] (via `WarmTier.knownFactions`)
**Used by:** [[validators/deterministic-runner]]
**Severity rationale:** brand-new sects/clans appear naturally mid-saga, but they MUST round-trip through [[agents/canon-extractor]] → [[modules/canon-merger]] so the canon stays auditable. A low-severity flag surfaces missing extractions without blocking the chapter.

## Worker wiring
The worker pre-filters `knownFactionNames` to exclude `status='destroyed'` factions so the check still complains if the writer accidentally resurrects a wiped faction (`apps/worker/src/jobs/generate-chapter.ts → buildCheckCanon`).

## Related
- [[agents/canon-extractor]] — emits `factionUpdates[]` that should populate the table
- [[modules/canon-merger]] — auto-applies (or queues) the resulting rows
- [[validators/check-unknown-character]], [[validators/check-unknown-location]] — also consult `knownFactionNames` to suppress false positives
