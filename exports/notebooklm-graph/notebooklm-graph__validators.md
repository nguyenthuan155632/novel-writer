# Novel graph — validators

## check-cliffhanger

`validators/check-cliffhanger.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/cliffhanger.ts
---



Check: cliffhanger
**Severity:** low
**Logic:** Chapter ends without a detectable cliffhanger element.
**Source:** `packages/ai/src/validators/deterministic/cliffhanger.ts`
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/cliffhanger.ts
---



Check: cliffhanger
**Severity:** low
Chapter ends without a detectable cliffhanger.
**Source:** `packages/ai/src/validators/deterministic/cliffhanger.ts`
**Used by:** [[validators/deterministic-runner]]

---

## check-conflict-presence

`validators/check-conflict-presence.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/conflict-presence.ts
---



Check: conflict_presence
**Severity:** low
**Logic:** Chapter has no detectable conflict element.
**Source:** `packages/ai/src/validators/deterministic/conflict-presence.ts`
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/conflict-presence.ts
---



Check: conflict_presence
**Severity:** low
Chapter has no detectable conflict element.
**Source:** `packages/ai/src/validators/deterministic/conflict-presence.ts`
**Used by:** [[validators/deterministic-runner]]

---

## check-dead-character

`validators/check-dead-character.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/dead-character.ts
---



Check: dead_character
**Severity:** critical
**Logic:** Detects dead characters (status=dead) appearing as active participants in chapter content.
**Source:** `packages/ai/src/validators/deterministic/dead-character.ts`
**Reads:** [[database/tables/characters]]
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/dead-character.ts
---



Check: dead_character
**Severity:** critical
Detects dead characters (status=dead) appearing as active participants in chapter.
**Source:** `packages/ai/src/validators/deterministic/dead-character.ts`
**Reads:** [[database/tables/characters]]
**Used by:** [[validators/deterministic-runner]]

---

## check-forbidden-move

`validators/check-forbidden-move.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/forbidden-move.ts
---



Check: forbidden_move
**Severity:** high
**Logic:** Chapter content triggers forbidden rules defined in the story bible.
**Source:** `packages/ai/src/validators/deterministic/forbidden-move.ts`
**Reads:** [[database/tables/story-bibles]].forbiddenRules
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/forbidden-move.ts
---



Check: forbidden_move
**Severity:** high
Content triggers forbidden rules from story bible.
**Source:** `packages/ai/src/validators/deterministic/forbidden-move.ts`
**Reads:** [[database/tables/story-bibles]].forbiddenRules
**Used by:** [[validators/deterministic-runner]]

---

## check-locked-fact

`validators/check-locked-fact.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/locked-fact.ts
---



Check: locked_fact
**Severity:** high
**Logic:** Chapter content contradicts a locked canon fact.
**Source:** `packages/ai/src/validators/deterministic/locked-fact.ts`
**Reads:** [[database/tables/canon-facts]] (locked=true)
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/locked-fact.ts
---



Check: locked_fact
**Severity:** high
Chapter content contradicts a locked canon fact.
**Source:** `packages/ai/src/validators/deterministic/locked-fact.ts`
**Reads:** [[database/tables/canon-facts]] (locked=true)
**Used by:** [[validators/deterministic-runner]]

---

## check-new-bloodline-source

`validators/check-new-bloodline-source.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/new-bloodline-source.ts
---



Check: new_bloodline_source
**Severity:** medium
**Logic:** New bloodline introduced without a valid source. Cultivation/martial genres only.
**Source:** `packages/ai/src/validators/deterministic/new-bloodline-source.ts`
**Reads:** [[database/tables/bloodlines]]
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/new-bloodline-source.ts
---



Check: new_bloodline_source
**Severity:** medium
New bloodline without valid source. Cultivation/martial only.
**Source:** `packages/ai/src/validators/deterministic/new-bloodline-source.ts`
**Reads:** [[database/tables/bloodlines]]
**Used by:** [[validators/deterministic-runner]]

---

## check-realm-jump

`validators/check-realm-jump.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/realm-jump.ts
---



Check: realm_jump
**Severity:** critical
**Logic:** Detects more than 1 realm breakthrough per chapter (cultivation genres only). MAX_REALM_JUMP_PER_CHAPTER=1.
**Source:** `packages/ai/src/validators/deterministic/realm-jump.ts`
**Applies to:** cultivation, martial genre families only
**Config:** [[configs/config-generation]]
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/realm-jump.ts
---



Check: realm_jump
**Severity:** critical
Detects >1 realm breakthrough per chapter (cultivation/martial genres only). MAX=1.
**Source:** `packages/ai/src/validators/deterministic/realm-jump.ts`
**Config:** [[configs/config-generation]] — MAX_REALM_JUMP_PER_CHAPTER
**Used by:** [[validators/deterministic-runner]]

---

## check-repetition

`validators/check-repetition.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/repetition.ts
---



Check: repetition
**Severity:** low
**Logic:** Detects excessive phrase or sentence repetition in chapter content.
**Source:** `packages/ai/src/validators/deterministic/repetition.ts`
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/repetition.ts
---



Check: repetition
**Severity:** low
Excessive phrase/sentence repetition in chapter content.
**Source:** `packages/ai/src/validators/deterministic/repetition.ts`
**Used by:** [[validators/deterministic-runner]]

---

## check-style-red-flags

`validators/check-style-red-flags.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/style-red-flags.ts
---



Check: style_red_flags
**Severity:** medium
**Logic:** Style issues such as character name abbreviations (e.g., "LTS" instead of full name).
**Source:** `packages/ai/src/validators/deterministic/style-red-flags.ts`
**Reads:** [[database/tables/story-bibles]] (styleGuide)
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/style-red-flags.ts
---



Check: style_red_flags
**Severity:** medium
Style issues such as character name abbreviations (e.g. "LTS").
**Source:** `packages/ai/src/validators/deterministic/style-red-flags.ts`
**Reads:** [[database/tables/story-bibles]].styleGuide
**Used by:** [[validators/deterministic-runner]]

---

## check-unknown-character

`validators/check-unknown-character.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-character.ts
---



Check: unknown_character
**Severity:** medium
**Logic:** Character names appearing in chapter that aren't in the canon character roster.
**Source:** `packages/ai/src/validators/deterministic/unknown-character.ts`
**Reads:** [[database/tables/characters]], [[database/tables/factions]] (suppression set), [[database/tables/bloodlines]] (suppression set), `knownLocationNames` (suppression set), locked facts
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-character.ts
---



Check: unknown_character
**Severity:** medium
Character names in chapter not found in canon roster (and not in any other canonical name set: factions, bloodlines, locations, locked-fact topics).
**Source:** `packages/ai/src/validators/deterministic/unknown-character.ts`
**Reads:** [[database/tables/characters]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]

---

## check-unknown-faction

`validators/check-unknown-faction.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-faction.ts
---



Check: unknown_faction Worker wiring
**Severity:** low
**Logic:** Flags Vietnamese proper-noun phrases preceded by a faction-introducing prefix (`môn phái`, `tông môn`, `tông phái`, `gia tộc`, `thế gia`, `thị tộc`, `liên minh`, `liên bang`, `vương triều`, `đế quốc`, `hoàng triều`, `tà phái`, `chính phái`, `hắc đạo`, `bạch đạo`, `thương hội`, `sơn trại`) when the name is not in the canonical [[database/tables/factions]] list (and not a known character / bloodline / location, to avoid double-flagging).
**Source:** `packages/ai/src/validators/deterministic/unknown-faction.ts`
**Reads:** [[database/tables/factions]] (via `WarmTier.knownFactions`)
**Used by:** [[validators/deterministic-runner]]
**Severity rationale:** brand-new sects/clans appear naturally mid-saga, but they MUST round-trip through [[agents/canon-extractor]] → [[modules/canon-merger]] so the canon stays auditable. A low-severity flag surfaces missing extractions without blocking the chapter.
The worker pre-filters `knownFactionNames` to exclude `status='destroyed'` factions so the check still complains if the writer accidentally resurrects a wiped faction (`apps/worker/src/jobs/generate-chapter.ts → buildCheckCanon`).



Check: unknown_faction Related
- [[agents/canon-extractor]] — emits `factionUpdates[]` that should populate the table
- [[modules/canon-merger]] — auto-applies (or queues) the resulting rows
- [[validators/check-unknown-character]], [[validators/check-unknown-location]] — also consult `knownFactionNames` to suppress false positives

---

## check-unknown-location

`validators/check-unknown-location.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-location.ts
---



Check: unknown_location
**Severity:** medium
**Logic:** Locations used in chapter that aren't found in any canon source. Suppresses matches that appear in `knownCharacterNames`, `knownBloodlineNames`, or `knownFactionNames` to avoid double-flagging.
**Source:** `packages/ai/src/validators/deterministic/unknown-location.ts`
**Reads:** [[database/tables/canon-facts]], [[database/tables/story-bibles]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]
---
type: validator-check
source: packages/ai/src/validators/deterministic/unknown-location.ts
---



Check: unknown_location
**Severity:** medium
Locations used that aren't in any canon source. Faction/character/bloodline names are suppressed.
**Source:** `packages/ai/src/validators/deterministic/unknown-location.ts`
**Reads:** [[database/tables/canon-facts]], [[database/tables/story-bibles]], [[database/tables/factions]] (suppression set)
**Used by:** [[validators/deterministic-runner]]

---

## check-word-count

`validators/check-word-count.md`

---
type: validator-check
source: packages/ai/src/validators/deterministic/word-count.ts
---



Check: word_count
**Severity:** high
**Logic:** Chapter word count must be within HARD_FAIL bounds (1500–4000). Rejects if outside range.
**Source:** `packages/ai/src/validators/deterministic/word-count.ts`
**Used by:** [[validators/deterministic-runner]]
**Config:** [[configs/config-generation]] — `CHAPTER_HARD_FAIL_WORDS`
---
type: validator-check
source: packages/ai/src/validators/deterministic/word-count.ts
---



Check: word_count
**Severity:** high
Chapter word count must be within 1500–4000 words (CHAPTER_HARD_FAIL_WORDS).
**Source:** `packages/ai/src/validators/deterministic/word-count.ts`
**Config:** [[configs/config-generation]]
**Used by:** [[validators/deterministic-runner]]

---

## deterministic-runner

`validators/deterministic-runner.md`

---
type: validator
source: packages/ai/src/validators/deterministic/runner.ts
---



Validator: Deterministic Runner Responsibility
Builds and executes the suite of deterministic (no-LLM) checks on generated chapter content. Short-circuits on first critical failure. Sorted by severity: critical first.



Validator: Deterministic Runner Source Evidence
`packages/ai/src/validators/deterministic/runner.ts`
- `buildChecks(forbiddenRulesText, genreFamily)` — selects applicable checks
- `runDeterministicValidator(input)` — executes checks



Validator: Deterministic Runner Inputs
- `CheckInput`: chapter content, packet, characters, canon facts, bible (forbiddenRules), genre family
- `forbiddenRulesText` — from story bible



Validator: Deterministic Runner Outputs
- Array of `CheckResult`: `{ checkId, severity, pass, message }`
- Persisted to [[database/tables/chapters]].`deterministicValidation`



Validator: Deterministic Runner Checks Included (12 total)
- [[validators/check-word-count]]
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-locked-fact]]
- [[validators/check-forbidden-move]]
- [[validators/check-unknown-character]]
- [[validators/check-unknown-location]]
- [[validators/check-new-bloodline-source]] (cultivation genres only)
- [[validators/check-cliffhanger]]
- [[validators/check-conflict-presence]]
- [[validators/check-style-red-flags]]
- [[validators/check-repetition]]



Validator: Deterministic Runner Short-circuit Logic
Stops processing after first `critical` severity failure.



Validator: Deterministic Runner Genre-specific Checks
`new_bloodline_source` and `realm_jump` only apply to `cultivation` and `martial` genre families.



Validator: Deterministic Runner Used By
- [[jobs/job-generate-chapter]] (Stage 6)
- [[pipelines/chapter-generation-pipeline]]



Validator: Deterministic Runner Related Flows
- [[flows/validation-flow]]
---
type: validator
source: packages/ai/src/validators/deterministic/runner.ts
---



Validator: Deterministic Runner Responsibility
Builds and executes the suite of 12 deterministic (no-LLM) checks. Short-circuits on first critical failure. Sorted critical-first.



Validator: Deterministic Runner Source Evidence
`packages/ai/src/validators/deterministic/runner.ts`
- `buildChecks(forbiddenRulesText, genreFamily)`
- `runDeterministicValidator(input)`



Validator: Deterministic Runner Checks (12 total)
- [[validators/check-word-count]] (high)
- [[validators/check-dead-character]] (critical)
- [[validators/check-realm-jump]] (critical, cultivation only)
- [[validators/check-locked-fact]] (high)
- [[validators/check-forbidden-move]] (high)
- [[validators/check-unknown-character]] (medium)
- [[validators/check-unknown-location]] (medium)
- [[validators/check-new-bloodline-source]] (medium, cultivation only)
- [[validators/check-cliffhanger]] (low)
- [[validators/check-conflict-presence]] (low)
- [[validators/check-style-red-flags]] (medium)
- [[validators/check-repetition]] (low)



Validator: Deterministic Runner Short-circuit
Stops after first critical failure.



Validator: Deterministic Runner Genre Filtering
`new_bloodline_source` and `realm_jump` only for `cultivation`/`martial` genre families.



Validator: Deterministic Runner Used By
- [[jobs/job-generate-chapter]] (Stage 6)
- [[pipelines/chapter-generation-pipeline]]



Validator: Deterministic Runner Related Flows
- [[flows/validation-flow]]

---

## packet-auditor

`validators/packet-auditor.md`

---
type: validator
source: packages/ai/src/validators/packet-auditor.ts
---



Validator: Packet Auditor Responsibility
Deterministic pre-write audit of the `ChapterPacket` before chapter writing begins. No LLM calls. Catches structural packet issues early.



Validator: Packet Auditor Source Evidence
`packages/ai/src/validators/packet-auditor.ts` — `auditPacket(input, ctx)`



Validator: Packet Auditor Checks Performed
- Dead characters referenced in packet
- Overdue seeds not addressed in packet
- Missing conflict in packet
- Missing cliffhanger in packet
- Realm jump excess in packet
- Overdue turning points missed



Validator: Packet Auditor Inputs
- `ChapterPacket`
- Context snapshot: characters, planted seeds, arc turning points



Validator: Packet Auditor Outputs
- `{ pass: boolean, issues: AuditIssue[] }`
- On fail: triggers packet regeneration (up to 1 extra attempt in pipeline)
- Updates [[database/tables/chapters]].`packetAuditStatus`



Validator: Packet Auditor Used By
- [[jobs/job-generate-chapter]] (Stage 3 — AUDIT)
- [[pipelines/chapter-generation-pipeline]]



Validator: Packet Auditor Related Tables
- [[database/tables/chapter-packets]]
- [[database/tables/chapters]]



Validator: Packet Auditor Related Flows
- [[flows/chapter-generation-flow]]
---
type: validator
source: packages/ai/src/validators/packet-auditor.ts
---



Validator: Packet Auditor Responsibility
Deterministic pre-write audit of ChapterPacket before writing begins. No LLM. Catches structural issues early.



Validator: Packet Auditor Source Evidence
`packages/ai/src/validators/packet-auditor.ts` — `auditPacket(input, ctx)`



Validator: Packet Auditor Checks
- Dead characters referenced in packet
- Overdue seeds not addressed
- Missing conflict in packet
- Missing cliffhanger in packet
- Realm jump excess in packet
- Overdue turning points missed



Validator: Packet Auditor Inputs
- `ChapterPacket`
- Context: characters, planted seeds, arc turning points



Validator: Packet Auditor Outputs
- `{ pass: boolean, issues: AuditIssue[] }`
- On fail: pipeline regenerates packet (up to 1 extra attempt)
- Updates [[database/tables/chapters]].packetAuditStatus



Validator: Packet Auditor Used By
- [[jobs/job-generate-chapter]] (Stage 3 — AUDIT)
- [[pipelines/chapter-generation-pipeline]]



Validator: Packet Auditor Related Tables
- [[database/tables/chapter-packets]]
- [[database/tables/chapters]]

---
