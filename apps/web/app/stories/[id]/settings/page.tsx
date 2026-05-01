'use client';

import { useState, useEffect, use } from 'react';
import { getStorySettings } from '@/lib/api/story-settings';
import { apiFetch } from '@/lib/api-client';
import {
  GENRES, PERSONALITIES,
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type GenreSlug, type PersonalitySlug, type StoryOptions,
} from '@novel/core/catalog';

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

interface StoryData {
  id: string;
  genre: string;
  mainCharacterPersonality: string;
  genreLockedAt: string | null;
}

interface SettingsData {
  overrides: { storyOptions?: StoryOptions } & Record<string, unknown>;
}

function SelectField({ label, list, value, onChange }: {
  label: string;
  list: readonly { slug: string; viLabel: string }[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">(không chỉ định)</option>
        {list.map(opt => <option key={opt.slug} value={opt.slug}>{opt.viLabel}</option>)}
      </select>
    </div>
  );
}

function GenrePersonalityEditor({
  story, settings, onSaved,
}: {
  story: StoryData;
  settings: SettingsData;
  onSaved: () => void;
}) {
  const [genre, setGenre] = useState<GenreSlug>(story.genre as GenreSlug);
  const [personality, setPersonality] = useState<PersonalitySlug>(story.mainCharacterPersonality as PersonalitySlug);
  const [opts, setOpts] = useState<StoryOptions>(settings.overrides.storyOptions ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const genreLocked = story.genreLockedAt != null;

  async function save() {
    setSaving(true); setError(null);
    try {
      await apiFetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(genreLocked ? {} : { genre }),
          mainCharacterPersonality: personality,
          storyOptions: opts,
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="studio-panel">
      <h2>Genre & Personality</h2>
      {genreLocked && (
        <div style={{ background: '#fff3cd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          Genre đã khoá vì bible đã sinh. Personality và Story Options vẫn có thể đổi nhưng chỉ ảnh hưởng đến chương sinh sau.
        </div>
      )}

      <div className="field-group">
        <label>Genre</label>
        <select value={genre} onChange={e => setGenre(e.target.value as GenreSlug)} disabled={genreLocked}>
          {GENRES.map(g => <option key={g.slug} value={g.slug}>{g.viLabel}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Personality</label>
        <select value={personality} onChange={e => setPersonality(e.target.value as PersonalitySlug)}>
          {PERSONALITIES.map(p => <option key={p.slug} value={p.slug}>{p.viLabel}</option>)}
        </select>
      </div>

      <details>
        <summary>Tuỳ chọn nâng cao</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
          <SelectField label="Tone" list={TONES} value={opts.tone} onChange={v => setOpts({ ...opts, tone: v as StoryOptions['tone'] })} />
          <SelectField label="Pacing" list={PACINGS} value={opts.pacing} onChange={v => setOpts({ ...opts, pacing: v as StoryOptions['pacing'] })} />
          <SelectField label="Main Conflict Type" list={MAIN_CONFLICT_TYPES} value={opts.mainConflictType} onChange={v => setOpts({ ...opts, mainConflictType: v as StoryOptions['mainConflictType'] })} />
          <SelectField label="Power System Style" list={POWER_SYSTEM_STYLES} value={opts.powerSystemStyle} onChange={v => setOpts({ ...opts, powerSystemStyle: v as StoryOptions['powerSystemStyle'] })} />
          <SelectField label="World Era" list={WORLD_ERAS} value={opts.worldEra} onChange={v => setOpts({ ...opts, worldEra: v as StoryOptions['worldEra'] })} />
          <SelectField label="Romance Level" list={ROMANCE_LEVELS} value={opts.romanceLevel} onChange={v => setOpts({ ...opts, romanceLevel: v as StoryOptions['romanceLevel'] })} />
          <SelectField label="Comedy Level" list={COMEDY_LEVELS} value={opts.comedyLevel} onChange={v => setOpts({ ...opts, comedyLevel: v as StoryOptions['comedyLevel'] })} />
          <SelectField label="Dark Level" list={DARK_LEVELS} value={opts.darkLevel} onChange={v => setOpts({ ...opts, darkLevel: v as StoryOptions['darkLevel'] })} />
          <SelectField label="POV" list={POVS} value={opts.pov} onChange={v => setOpts({ ...opts, pov: v as StoryOptions['pov'] })} />
          <SelectField label="Protagonist Morality" list={MORALITIES} value={opts.protagonistMorality} onChange={v => setOpts({ ...opts, protagonistMorality: v as StoryOptions['protagonistMorality'] })} />
        </div>
      </details>

      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </section>
  );
}

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [story, setStory] = useState<StoryData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [json, setJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [storyData, settingsData] = await Promise.all([
        apiFetch<StoryData>(`/api/stories/${id}`),
        getStorySettings(id),
      ]);
      setStory(storyData);
      setSettings(settingsData as SettingsData);
      setJson(JSON.stringify(settingsData.overrides, null, 2));
    } catch {
      setJson('{}');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
      const r = await fetch(`${BASE}/api/stories/${id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: parsed }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`putStorySettings ${r.status}: ${text}`);
      }
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Generation controls</p>
          <h1>Story Settings</h1>
          <p className="studio-subtitle">Override generation defaults for this story. Edit JSON directly or use a preset below.</p>
        </div>
      </header>

      {story && settings && (
        <GenrePersonalityEditor
          story={story}
          settings={settings}
          onSaved={fetchData}
        />
      )}

      <div className="studio-panel form-grid">
      <div className="button-row">
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
        style={{ fontFamily: 'monospace', fontSize: 13 }}
      />

      {message && (
        <p className={message.type === 'success' ? 'muted' : 'error'}>
          {message.text}
        </p>
      )}

      <button className="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      </div>
    </div>
  );
}
