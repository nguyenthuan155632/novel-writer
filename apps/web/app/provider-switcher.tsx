'use client';

import { useEffect, useState } from 'react';
import {
  getProviderStatus,
  updateProvider,
  type LlmProviderId,
  type ProviderOption,
} from '@/lib/api/provider';

export default function ProviderSwitcher() {
  const [provider, setProvider] = useState<LlmProviderId | null>(null);
  const [options, setOptions] = useState<ProviderOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProviderStatus()
      .then((status) => {
        if (cancelled) return;
        setProvider(status.provider);
        setOptions(status.options);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onChange(next: LlmProviderId) {
    const previous = provider;
    setProvider(next);
    setSaving(true);
    setError(null);
    try {
      const status = await updateProvider(next);
      setProvider(status.provider);
      setOptions(status.options);
    } catch (e) {
      setProvider(previous);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="provider-switcher" aria-label="LLM provider">
      <select
        aria-label="LLM provider"
        value={provider ?? ''}
        disabled={!provider || saving}
        onChange={(e) => onChange(e.target.value as LlmProviderId)}
      >
        {!provider && <option value="">Provider...</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="provider-switcher-error">{error}</span>}
    </div>
  );
}
