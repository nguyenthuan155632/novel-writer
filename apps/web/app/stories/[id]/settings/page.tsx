'use client';

import { useState, useEffect, use } from 'react';
import { getStorySettings, putStorySettings } from '@/lib/api/story-settings';

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const PRESETS: { label: string; overrides: Record<string, unknown> }[] = [
  { label: 'Higher temperature (warmer prose)', overrides: { generation: { WRITER_TEMPERATURE: 0.95 } } },
  { label: 'Tighter budget ($0.03/chapter)', overrides: { budget: { PER_CHAPTER_HARD_CAP_USD: 0.03 } } },
  { label: 'Use Flash for writer', overrides: { model: { routes: { writer: 'google/gemini-2.5-flash' } } } },
  { label: 'Refresh saga summary every 10 chapters', overrides: { longForm: { SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 10 } } },
];

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [json, setJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getStorySettings(id)
      .then((settings) => {
        setJson(JSON.stringify(settings.overrides, null, 2));
      })
      .catch(() => {
        setJson('{}');
      })
      .finally(() => setLoading(false));
  }, [id]);

  function applyPreset(preset: Record<string, unknown>) {
    let current: Record<string, unknown>;
    try {
      current = JSON.parse(json);
    } catch {
      current = {};
    }
    if (typeof current !== 'object' || current === null || Array.isArray(current)) current = {};
    const merged = deepMerge(current, preset);
    setJson(JSON.stringify(merged, null, 2));
  }

  async function save() {
    setMessage(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMessage({ type: 'error', text: 'Invalid JSON.' });
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setMessage({ type: 'error', text: 'Settings must be a JSON object, not an array or null.' });
      return;
    }
    setSaving(true);
    try {
      await putStorySettings(id, parsed as Record<string, unknown>);
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Story Settings</h2>
      <p style={{ marginBottom: 12, color: '#666' }}>
        Override generation defaults for this story. Edit JSON directly or use a preset below.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p.overrides)}>
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        rows={16}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }}
      />

      {message && (
        <p style={{ color: message.type === 'success' ? 'green' : 'red', marginBottom: 12 }}>
          {message.text}
        </p>
      )}

      <button className="primary" onClick={save} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}