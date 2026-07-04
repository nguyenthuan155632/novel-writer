export type LlmProviderId = 'openai-compatible' | 'openrouter' | 'ollama' | 'vmlx';

export function parseLlmProvider(value: string | undefined): LlmProviderId {
  if (value === 'openai-compatible') return 'openai-compatible';
  if (value === 'openrouter') return 'openrouter';
  if (value === 'ollama') return 'ollama';
  if (value === 'vmlx') return 'vmlx';
  return 'openai-compatible';
}
