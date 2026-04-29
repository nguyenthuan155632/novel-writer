export type LlmProviderId = 'opencode' | 'openrouter';

export function parseLlmProvider(value: string | undefined): LlmProviderId {
  if (value === 'openrouter') return 'openrouter';
  return 'opencode';
}
