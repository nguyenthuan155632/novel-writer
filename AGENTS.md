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
