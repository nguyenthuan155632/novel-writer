export type LlmProviderId = 'opencode' | 'openrouter' | 'ollama';

export function parseLlmProvider(value: string | undefined): LlmProviderId {
  if (value === 'openrouter') return 'openrouter';
  if (value === 'ollama') return 'ollama';
  return 'opencode';
}
