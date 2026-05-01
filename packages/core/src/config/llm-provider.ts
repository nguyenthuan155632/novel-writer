export type LlmProviderId = 'opencode' | 'openrouter' | 'ollama' | 'vmlx';

export function parseLlmProvider(value: string | undefined): LlmProviderId {
  if (value === 'openrouter') return 'openrouter';
  if (value === 'ollama') return 'ollama';
  if (value === 'vmlx') return 'vmlx';
  return 'opencode';
}
