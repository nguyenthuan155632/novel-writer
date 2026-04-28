import { CONTEXT_CONFIG } from '@novel/core';

export function detectPastReferences(text: string, keywords?: readonly string[]): string[] {
  const kws = keywords ?? CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS;
  const lower = text.toLowerCase();
  return kws.filter(kw => lower.includes(kw.toLowerCase()));
}