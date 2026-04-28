'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface Bible {
  worldRules: string;
  cultivationSystem: string;
  bloodlineSystem: string;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

export function EditForm({ storyId, bible }: { storyId: string; bible: Bible }) {
  const [data, setData] = useState({
    worldRules: bible.worldRules,
    cultivationSystem: bible.cultivationSystem,
    bloodlineSystem: bible.bloodlineSystem,
    styleGuide: bible.styleGuide,
    forbiddenRules: bible.forbiddenRules,
    endingDirection: bible.endingDirection ?? '',
    compactSummary: bible.compactSummary ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function bind<K extends keyof typeof data>(k: K) {
    return {
      value: data[k],
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setData({ ...data, [k]: e.target.value }),
    };
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <label>World Rules</label>
      <textarea rows={6} {...bind('worldRules')} />

      <label>Cultivation System</label>
      <textarea rows={6} {...bind('cultivationSystem')} />

      <label>Bloodline System</label>
      <textarea rows={5} {...bind('bloodlineSystem')} />

      <label>Style Guide</label>
      <textarea rows={4} {...bind('styleGuide')} />

      <label>Forbidden Rules</label>
      <textarea rows={4} {...bind('forbiddenRules')} />

      <label>Ending Direction</label>
      <textarea rows={3} {...bind('endingDirection')} />

      <label>Compact Summary (≤ 1500 từ — dùng cho HOT cache)</label>
      <textarea rows={6} {...bind('compactSummary')} />

      {err && <p className="error">{err}</p>}
      <button className="primary" onClick={save} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? 'Saving...' : 'Save (creates new version)'}
      </button>
    </div>
  );
}