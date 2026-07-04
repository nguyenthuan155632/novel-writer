# AI Agents: Novel Factory

This document describes the 11 specialized LLM agents that power the novel generation pipeline. These agents are located in `packages/ai/src/agents/` and use templates from `packages/ai/src/prompts/`.

## 1. World Building & Planning Agents

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Bible Generator** | High-level world building. | One-line premise. | Comprehensive Bible (Factions, Bloodlines, Power Systems, World Lore). |
| **Saga Planner** | Long-term plot strategy. | Story Bible + Premise. | Multi-saga roadmap (e.g., Rise, Conflict, Ascension). |
| **Arc Planner** | Mid-term narrative beats. | Current Saga + Bible. | List of Arcs with specific goals and seeds to resolve. |
| **Packet Generator** | Per-chapter blueprinting. | Arc Summary + Context. | `ChapterPacket`: Specific events, characters present, conflict, and cliffhanger. |

## 2. Writing & Content Generation

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Writer** | Narrative prose generation. | `ChapterPacket` + Full Context. | 2000–3000 word Vietnamese chapter with title. |

## 3. Review & Validation Agents

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **LLM Validator** | Soft quality & voice check. | Generated Chapter + Style Guide. | Assessment of voice drift, plot logic, and style adherence. |
| **Auto-Fixer** | Small-scale repair. | Chapter + Validator Issues. | Patched chapter addressing low/medium severity issues. |
| **High-Stakes Reviewer** | Critical evaluation. | Full Arc / Major Events. | Deep critique and high-level consistency check (uses Pro models). |

## 4. Maintenance & Maintenance Agents

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Canon Extractor** | Knowledge harvesting. | Generated Chapter. | `pending_canon_updates` (new facts, character changes, event results). |
| **Summary Compactor** | Context preservation. | Chapter Content. | 200–500 token rolling summary of the chapter. |
| **Arc Summary Compactor** | Hierarchical memory. | Past Chapter Summaries. | Condensed rolling summary of the entire active arc. |

## Non-LLM "Agents" (Deterministic)

While not LLMs, these components are critical parts of the agentic workflow:

- **Packet Auditor**: Codeside check of the `ChapterPacket` against the Canon DB (e.g., verifying a character isn't dead before they appear).
- **Deterministic Validator**: Regex-based checks for forbidden words, formatting, and technical metadata.
- **Canon Merger**: Logic for auto-merging low-conflict facts or queuing them for human review.

## Pipeline Integration

Most generation tasks follow this sequence:
1. **Planning**: `Saga` -> `Arc` -> `Packet`.
2. **Writing**: `Writer`.
3. **Verification**: `Validator` -> `Auto-Fixer` (if needed).
4. **Memory**: `Extractor` -> `Compactor`.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **novel-writer** (6833 symbols, 9651 relationships, 222 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/novel-writer/context` | Codebase overview, check index freshness |
| `gitnexus://repo/novel-writer/clusters` | All functional areas |
| `gitnexus://repo/novel-writer/processes` | All execution flows |
| `gitnexus://repo/novel-writer/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Api area (67 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Routes area (66 symbols) | `.claude/skills/generated/routes/SKILL.md` |
| Work in the Services area (56 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Agents area (51 symbols) | `.claude/skills/generated/agents/SKILL.md` |
| Work in the Context area (45 symbols) | `.claude/skills/generated/context/SKILL.md` |
| Work in the Jobs area (43 symbols) | `.claude/skills/generated/jobs/SKILL.md` |
| Work in the Providers area (30 symbols) | `.claude/skills/generated/providers/SKILL.md` |
| Work in the Validators area (14 symbols) | `.claude/skills/generated/validators/SKILL.md` |
| Work in the Contracts area (13 symbols) | `.claude/skills/generated/contracts/SKILL.md` |
| Work in the Notebooklm-export area (8 symbols) | `.claude/skills/generated/notebooklm-export/SKILL.md` |
| Work in the [chapterNumber] area (8 symbols) | `.claude/skills/generated/chapternumber/SKILL.md` |
| Work in the Config area (7 symbols) | `.claude/skills/generated/config/SKILL.md` |
| Work in the Bible area (6 symbols) | `.claude/skills/generated/bible/SKILL.md` |
| Work in the Chapters area (5 symbols) | `.claude/skills/generated/chapters/SKILL.md` |
| Work in the Settings area (5 symbols) | `.claude/skills/generated/settings/SKILL.md` |
| Work in the Admin area (5 symbols) | `.claude/skills/generated/admin/SKILL.md` |
| Work in the Plugins area (4 symbols) | `.claude/skills/generated/plugins/SKILL.md` |
| Work in the Cluster_7 area (4 symbols) | `.claude/skills/generated/cluster-7/SKILL.md` |
| Work in the App area (4 symbols) | `.claude/skills/generated/app/SKILL.md` |
| Work in the Prompts area (4 symbols) | `.claude/skills/generated/prompts/SKILL.md` |

<!-- gitnexus:end -->
