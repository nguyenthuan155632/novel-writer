import { sha256 } from '@novel/core/utils/hash';
import type { HotTier, WarmTier } from './types.js';
import { canonicalJsonStringify } from './serialize.js';

export function computeHotHash(hot: HotTier): string {
  const canonical = canonicalJsonStringify(hot);
  return sha256(canonical);
}

export function computeWarmHash(warm: WarmTier): string {
  const canonical = canonicalJsonStringify(warm);
  return sha256(canonical);
}