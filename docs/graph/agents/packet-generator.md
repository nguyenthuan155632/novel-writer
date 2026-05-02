---
type: ai-agent
source: packages/ai/src/agents/packet-generator.ts
---

# Agent: Packet Generator

## Responsibility
Generates the `ChapterPacket` — a structured chapter plan with goal, required events, characters in scene, conflict, cliffhanger, and forbidden moves. Up to 3 internal retries with JSON repair fallback.

## Source Evidence
`packages/ai/src/agents/packet-generator.ts` — `PacketGenerator`

## Inputs
- `PacketGeneratorV2PromptInput`: bibleCompact, arcSummary, characters, threads, seeds, recent events, pacing hints, overdue turning points, etc.
- LLM provider

## Outputs
- `ChapterPacketSchema` validated object — `ChapterPacket`
- On parse failure: attempts JSON repair (`repairPacket`), then sentence-safe normalization

## Prompt
- [[prompts/prompt-packet-generator-v2]] — `DualPromptTemplate`

## Schema
`packages/ai/src/schemas/packet.ts` — `ChapterPacketSchema`, `PACKET_LIMITS`

## Depends On
- [[prompts/prompt-packet-generator-v2]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 2 — PLAN)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapter-packets]]

## Related Flows
- [[flows/chapter-generation-flow]]
---
type: ai-agent
source: packages/ai/src/agents/packet-generator.ts
---

# Agent: Packet Generator

## Responsibility
Generates the ChapterPacket — structured chapter plan with goal, events, characters, conflict, cliffhanger, forbidden moves. Up to 3 retries with JSON repair fallback.

## Source Evidence
`packages/ai/src/agents/packet-generator.ts` — `PacketGenerator`

## Inputs
- `PacketGeneratorV2PromptInput`: bibleCompact, arcSummary, active characters, open threads, due seeds, recent events, pacing hints, overdue turning points
- LLM provider

## Outputs
- `ChapterPacketSchema` validated `ChapterPacket`
- On parse failure: JSON repair (`repairPacket`), then sentence-safe normalization

## Prompt
[[prompts/prompt-packet-generator-v2]] — DualPromptTemplate

## Schema
`packages/ai/src/schemas/packet.ts` — `ChapterPacketSchema`, `PACKET_LIMITS`

## Used By
- [[jobs/job-generate-chapter]] (Stage 2 — PLAN)
- [[pipelines/chapter-generation-pipeline]]

## Related Tables
- [[database/tables/chapter-packets]]

## Related Flows
- [[flows/chapter-generation-flow]]
