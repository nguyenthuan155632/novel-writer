'use client';

import { useEffect, useState } from 'react';
import {
  getModelStatus,
  updateModelRoutes,
  type AgentRole,
  type ModelOption,
  type ModelRoutes,
} from '@/lib/api/models';

export default function ModelSettings() {
  const [routes, setRoutes] = useState<Partial<ModelRoutes>>({});
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getModelStatus()
      .then((status) => {
        if (cancelled) return;
        setRoutes(status.routes);
        setOptions(status.options);
        setHints(status.hints);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setRoute(role: AgentRole, model: string) {
    setRoutes((current) => ({ ...current, [role]: model }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const status = await updateModelRoutes(routes);
      setRoutes(status.routes);
      setOptions(status.options);
      setHints(status.hints);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Models</h2>
          <p className="muted">Fill model IDs for each function. Changes apply until the API process restarts.</p>
        </div>
        <button className="primary" type="button" disabled={saving || options.length === 0} onClick={save}>
          {saving ? 'Saving...' : 'Save models'}
        </button>
      </div>

      <div className="model-hints" aria-label="Model ID hints">
        {hints.map((hint) => (
          <button
            key={hint}
            type="button"
            className="model-hint"
            title="Copy this model ID into the focused field"
            onClick={() => navigator.clipboard?.writeText(hint)}
          >
            {hint}
          </button>
        ))}
      </div>

      <div className="model-grid">
        {options.map((option) => (
          <label key={option.role} className="model-row">
            <span>
              <strong>{option.label}</strong>
              <span className="muted">{option.description}</span>
              <span className="model-env">{option.envVar}</span>
            </span>
            <input
              value={routes[option.role] ?? ''}
              placeholder="Paste model ID"
              onChange={(e) => setRoute(option.role, e.target.value)}
              list="model-id-hints"
            />
          </label>
        ))}
      </div>

      <datalist id="model-id-hints">
        {hints.map((hint) => (
          <option key={hint} value={hint} />
        ))}
      </datalist>

      {error && <p className="error">Failed to save models: {error}</p>}
      {saved && <p className="muted">Saved.</p>}
    </section>
  );
}
