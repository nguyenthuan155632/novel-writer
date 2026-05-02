---
type: module
source: packages/ai/src/context/cache-keys.ts
---

# Module: Context Cache Keys

**Type:** Module  
**Source:** `packages/ai/src/context/cache-keys.ts`

## Responsibility
Generates deterministic SHA-256 hashes of the HOT and WARM context tiers to detect cache invalidation.

## Key exports / functions
- `computeHotHash(hot: HotTier): string` — SHA-256 of canonically serialized HOT tier
- `computeWarmHash(warm: WarmTier): string` — SHA-256 of canonically serialized WARM tier

## Inputs
- `HotTier` object (bible, style guide, power system, contracts, few-shots)
- `WarmTier` object (saga/arc summaries, active characters, threads, seeds)

## Outputs
- Hex-encoded SHA-256 hash string

## Implementation notes
- Delegates to `canonicalJsonStringify()` from [[modules/context-serialize]] to sort all object keys recursively before hashing — ensures identical data always produces identical hash regardless of key insertion order
- Then passes canonical string through `sha256()` from `@novel/core/utils/hash`
- Hash stored in `ChapterContext.meta.hotHash` and `ChapterContext.meta.warmHash`

## Depends on
- [[modules/context-serialize]] — for `canonicalJsonStringify()`
- [[modules/context-types]] — for `HotTier`, `WarmTier` types

## Used by
- [[modules/context-builder]] — stores hashes in `context_packets` for cache hit detection

## Related database tables
- [[database/tables/context-packets]] — `hotHash` / `warmHash` fields

## Related flows
- [[flows/chapter-generation-flow]]
