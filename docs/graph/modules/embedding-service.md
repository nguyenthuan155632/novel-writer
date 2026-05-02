---
type: module
source: packages/ai/src/embeddings/service.ts
---

# Module: Embedding Service

## Responsibility
Vector embedding of text (canon facts, chapter summaries) for semantic retrieval.

## Source Evidence
`packages/ai/src/embeddings/service.ts` — `OpenRouterEmbeddingService`
`packages/ai/src/embeddings/types.ts` — `EmbeddingService` interface
`packages/ai/src/embeddings/mock.ts` — `MockEmbeddingService` (tests)

## Interface
`embed({ input, traceId }) → { vector: number[], usage, cost }`

## Production Implementation
- Class: `OpenRouterEmbeddingService`
- Endpoint: `https://openrouter.ai/api/v1/embeddings`
- Model: `openai/text-embedding-3-small` (dim 1536, env `EMBEDDING_MODEL`)
- Auth: `OPENROUTER_API_KEY`

## Inputs
- Text string(s)
- `traceId` for logging

## Outputs
- `vector: number[]` (1536 dimensions)
- Token usage + cost estimate

## Used By
- [[modules/canon-merger]] — embeds new canon facts
- [[modules/context-builder]] — queries for similar facts + past chapters

## Related Tables
- [[database/tables/canon-facts]] — stores embeddings
- [[database/tables/chapter-summaries]] — stores embeddings

## Related External Services
- [[external-services/openrouter-embeddings]]
---
type: module
source: packages/ai/src/embeddings/service.ts
---

# Module: Embedding Service

## Responsibility
Vector embedding for canon facts and chapter summaries. Used for semantic retrieval in context building and similarity checks.

## Source Evidence
`packages/ai/src/embeddings/service.ts` — `OpenRouterEmbeddingService`
`packages/ai/src/embeddings/types.ts` — `EmbeddingService` interface
`packages/ai/src/embeddings/mock.ts` — `MockEmbeddingService`

## Interface
`embed({ input, traceId }) → { vector: number[], usage, cost }`

## Production Implementation
- Endpoint: `https://openrouter.ai/api/v1/embeddings`
- Model: `openai/text-embedding-3-small` (1536 dims, env `EMBEDDING_MODEL`)
- Auth: `OPENROUTER_API_KEY`

## Used By
- [[modules/canon-merger]] — embeds new canon facts
- [[modules/context-builder]] — vector retrieval for facts + past chapters

## Related Tables
- [[database/tables/canon-facts]] (stores embeddings)
- [[database/tables/chapter-summaries]] (stores embeddings)

## Related External Services
- [[external-services/openrouter-embeddings]]
