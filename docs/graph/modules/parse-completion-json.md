---
type: module
source: packages/ai/src/parse-completion-json.ts
---

# Module: Parse Completion JSON

**Type:** Module  
**Source:** `packages/ai/src/parse-completion-json.ts`

## Responsibility
Safely parses JSON objects from LLM completion responses and wraps all completion calls with retry logic for transient model errors.

## Key exports / functions
- `parseCompletionJsonObject(res: CompletionResponse, context: string): unknown`
  - Extracts and parses a JSON object from a completion response
  - Falls back to `choices[0].message.parsed` (structured output) or `choices[0].message.content`
  - Throws a descriptive error if response is empty, null literal, or not a JSON object

- `withCompletionRetry(context, complete, maxRetries?): Promise<unknown>`
  - Wraps `complete()` with retry + calls `parseCompletionJsonObject` on success
  - Default: 3 retries with exponential backoff (1 s, 2 s, 4 s, capped at 30 s)

- `withCompletionRetryRaw(context, complete, maxRetries?): Promise<CompletionResponse>`
  - Same retry wrapper but returns raw `CompletionResponse` (caller parses)

## Inputs
- `CompletionResponse` from any [[ai-providers/provider-interface]] implementation
- `context: string` — human-readable label for error messages

## Outputs
- Parsed JSON object (`unknown`, cast by caller) or `CompletionResponse`

## Retry behavior
- Retried conditions: `finishReason === 'error'` or `finishReason === 'content_filter'`
- **Not** retried: JSON parse errors, wrong type errors (programming/prompt bugs)
- Exponential backoff: `min(1000 * 2^attempt, 30000)` ms

## Depends on
- [[ai-providers/provider-interface]] — for `CompletionResponse` type

## Used by
- [[agents/writer]] — parses structured chapter output
- [[agents/packet-generator]] — parses `ChapterPacket` JSON
- [[agents/llm-validator]] — parses validation output
- [[agents/auto-fixer]] — parses fix instructions
- [[agents/canon-extractor]] — parses extracted facts
- All other LLM agents expecting structured JSON responses

## Related flows
- [[flows/llm-provider-flow]]
