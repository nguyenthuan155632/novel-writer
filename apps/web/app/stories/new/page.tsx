'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  GENRES, PERSONALITIES,
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type GenreSlug, type PersonalitySlug, type StoryOptions,
} from '@novel/core/catalog';

const GENRE_DEFAULT_OPTIONS: Partial<Record<GenreSlug, Partial<StoryOptions>>> = {
  tien_hiep:   { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  huyen_huyen: { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  do_thi:      { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'skill',   worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  di_nang:     { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'ability', worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  cao_vo:      { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'martial', worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'righteous' },
  vo_thuat:    { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'martial', worldEra: 'ancient',    pov: 'third_limited', protagonistMorality: 'righteous' },
  khoa_huyen:  { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'tech',    worldEra: 'future',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
};

export default function NewStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState<GenreSlug>('tien_hiep');
  const [personality, setPersonality] = useState<PersonalitySlug>('tram_on');
  const [target, setTarget] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [opts, setOpts] = useState<StoryOptions>(GENRE_DEFAULT_OPTIONS.tien_hiep ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGenre = useMemo(() => GENRES.find(g => g.slug === genre)!, [genre]);
  const selectedPersonality = useMemo(() => PERSONALITIES.find(p => p.slug === personality)!, [personality]);

  function onChangeGenre(slug: GenreSlug) {
    setGenre(slug);
    const defaults = GENRE_DEFAULT_OPTIONS[slug] ?? {};
    setOpts(prev => ({ ...defaults, ...prev }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          title, premise,
          genre, mainCharacterPersonality: personality,
          storyOptions: opts,
          targetChapterCount: target,
        }),
      });
      router.push(`/stories/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">New manuscript</p>
          <h1>New Story</h1>
          <p className="studio-subtitle">Start with the creative brief that will guide the bible, planning, and chapter pipeline.</p>
        </div>
      </header>
      <form onSubmit={submit} className="studio-panel form-grid">
        <div className="field-group">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div className="field-group">
          <label>Premise (≥ 20 chars)</label>
          <textarea value={premise} onChange={e => setPremise(e.target.value)} rows={6} required minLength={20} />
        </div>

        <div className="field-group">
          <label>Genre</label>
          <select value={genre} onChange={e => onChangeGenre(e.target.value as GenreSlug)}>
            {GENRES.map(g => (
              <option key={g.slug} value={g.slug}>{g.viLabel}</option>
            ))}
          </select>
          <small>Quyết định phong cách thế giới, hệ thống sức mạnh, trope và tone tổng thể.</small>
          <small style={{ opacity: 0.7 }}>{selectedGenre.viDescription}</small>
        </div>

        <div className="field-group">
          <label>Main Character Personality</label>
          <select value={personality} onChange={e => setPersonality(e.target.value as PersonalitySlug)}>
            {PERSONALITIES.map(p => (
              <option key={p.slug} value={p.slug}>{p.viLabel}</option>
            ))}
          </select>
          <small>Ảnh hưởng đến cách nhân vật chính suy nghĩ, đối thoại và ra quyết định.</small>
          <small style={{ opacity: 0.7 }}>{selectedPersonality.viDescription}</small>
        </div>

        <div className="field-group">
          <button type="button" onClick={() => setShowAdvanced(s => !s)} style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
            {showAdvanced ? '▼' : '▶'} Tuỳ chọn nâng cao
          </button>
          {showAdvanced && (
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
          )}
        </div>

        <div className="field-group">
          <label>Target chapter count</label>
          <input type="number" min={1} value={target} onChange={e => setTarget(Number(e.target.value))} />
        </div>

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div className="button-row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
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
        {list.map(opt => (
          <option key={opt.slug} value={opt.slug}>{opt.viLabel}</option>
        ))}
      </select>
    </div>
  );
}
