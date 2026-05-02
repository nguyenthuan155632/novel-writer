---
type: module
source: packages/ai/src/context/serialize.ts
---

# Module: Context Serialize

**Type:** Module  
**Source:** `packages/ai/src/context/serialize.ts`

## Responsibility
Produces a deterministic (canonical) JSON string from any value by recursively sorting all object keys before stringifying — ensuring the same logical data always produces the same string regardless of insertion order.

## Key exports / functions
- `canonicalJsonStringify(value: unknown): string`
  - Normalizes value recursively (sorts object keys, passes arrays as-is)
  - Returns `JSON.stringify()` of the normalized result

## Inputs
- Any JavaScript value (object, array, primitive, `null`)

## Outputs
- A canonical JSON string with all object keys sorted alphabetically at every nesting level

## Implementation notes
- Internal `normalize(value)` function handles the recursive key-sorting
- Arrays are normalized element-by-element but not sorted (order matters for arrays)
- `null` / `undefined` are passed through as-is
- This is critical for cache-key stability: two `HotTier` objects that are semantically identical but built in different property orders will produce the same hash

## Depends on
- (none — pure utility)

## Used by
- [[modules/context-cache-keys]] — passes canonical JSON through SHA-256

## Related flows
- [[flows/chapter-generation-flow]]
