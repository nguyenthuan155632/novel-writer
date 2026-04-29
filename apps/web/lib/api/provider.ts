import { apiFetch } from '../api-client';

export type LlmProviderId = 'opencode' | 'openrouter' | 'ollama';

export interface ProviderOption {
  id: LlmProviderId;
  label: string;
}

export interface ProviderStatus {
  provider: LlmProviderId;
  options: ProviderOption[];
}

export function getProviderStatus(): Promise<ProviderStatus> {
  return apiFetch<ProviderStatus>('/api/admin/provider');
}

export function updateProvider(provider: LlmProviderId): Promise<ProviderStatus> {
  return apiFetch<ProviderStatus>('/api/admin/provider', {
    method: 'PUT',
    body: JSON.stringify({ provider }),
  });
}
