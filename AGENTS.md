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

## Local Working Protocol: Obsidian Graph First

You have access to Obsidian through the `mcp-obsidian` MCP server.

Before doing any non-trivial coding task, architecture task, debugging task, refactor, database change, worker change, AI provider change, validation change, or prompt change:

1. Search Obsidian first.
2. Use search terms based on the current task.
3. Read the most relevant Obsidian notes before planning.
4. In your plan, mention:
   - Obsidian notes consulted
   - relevant architecture/domain constraints found
   - whether documentation is missing or outdated
5. Only then inspect or modify source code.

After completing work:
1. If architecture, flow, schema, domain behavior, config, validation, or error handling changed, update the relevant Obsidian notes.
2. If no relevant note exists, create one.
3. In the final response, include:
   - Obsidian notes read
   - Obsidian notes updated
   - source files changed

Do not copy secrets into Obsidian.
Document env var names only, never values.

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
