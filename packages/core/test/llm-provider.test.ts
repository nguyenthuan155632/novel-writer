import { describe, expect, it } from 'vitest';
import { parseLlmProvider, type LlmProviderId } from '../src/config/llm-provider.ts';

describe('parseLlmProvider', () => {
  it('defaults to the reusable OpenAI-compatible provider id', () => {
    expect(parseLlmProvider(undefined)).toBe('openai-compatible');
    expect(parseLlmProvider('unknown')).toBe('openai-compatible');
  });

  it('recognizes the reusable OpenAI-compatible provider id', () => {
    const provider: LlmProviderId = 'openai-compatible';

    expect(parseLlmProvider(provider)).toBe('openai-compatible');
  });

  it('recognizes vmlx as a provider id', () => {
    const provider: LlmProviderId = 'vmlx';

    expect(parseLlmProvider(provider)).toBe('vmlx');
  });
});
