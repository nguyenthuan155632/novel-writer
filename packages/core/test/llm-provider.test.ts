import { describe, expect, it } from 'vitest';
import { parseLlmProvider, type LlmProviderId } from '../src/config/llm-provider.ts';

describe('parseLlmProvider', () => {
  it('recognizes vmlx as a provider id', () => {
    const provider: LlmProviderId = 'vmlx';

    expect(parseLlmProvider(provider)).toBe('vmlx');
  });
});
