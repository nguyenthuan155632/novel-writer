'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { patchSeed, deleteSeed, type PlantedSeed } from '@/lib/api/seeds';

export function SeedRow({ storyId, seed }: { storyId: string; seed: PlantedSeed }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seed);
  const router = useRouter();
  return (
    <li className="studio-card">
      <div className="studio-card-title">
        <code className="font-semibold">{seed.seedKey}</code>
        <span className="muted">payoff ch {seed.payoffChapter ?? '?'} · {seed.importance}</span>
      </div>
      {!editing && <p className="muted">{seed.description}</p>}
      {editing && (
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      )}
      <div className="button-row" style={{ marginTop: 10 }}>
        {editing ? (
          <>
            <button disabled={pending} className="primary"
              onClick={() => start(async () => { await patchSeed(storyId, seed.id, { description: draft.description }); setEditing(false); router.refresh(); })}>
              Save
            </button>
            <button onClick={() => { setDraft(seed); setEditing(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)}>Edit</button>
            <button disabled={pending} className="danger"
              onClick={() => start(async () => {
                if (!confirm(`Delete seed ${seed.seedKey}?`)) return;
                await deleteSeed(storyId, seed.id); router.refresh();
              })}>Delete</button>
          </>
        )}
      </div>
    </li>
  );
}
