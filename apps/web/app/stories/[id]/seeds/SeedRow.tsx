'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { patchSeed, deleteSeed, type PlantedSeed } from '@/lib/api/seeds';

const COLOR: Record<string, string> = { minor: 'gray', major: 'amber', climax: 'red' };

export function SeedRow({ storyId, seed }: { storyId: string; seed: PlantedSeed }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seed);
  const router = useRouter();
  return (
    <li className="border rounded p-3 text-sm">
      <div className="flex justify-between">
        <code className="font-semibold">{seed.seedKey}</code>
        <span className="text-xs text-gray-500">payoff ch {seed.payoffChapter ?? '?'} · {seed.importance}</span>
      </div>
      {!editing && <p className="mt-1 text-gray-700">{seed.description}</p>}
      {editing && (
        <textarea className="mt-1 w-full border rounded p-1 text-sm"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      )}
      <div className="mt-2 flex gap-2">
        {editing ? (
          <>
            <button disabled={pending} className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
              onClick={() => start(async () => { await patchSeed(storyId, seed.id, { description: draft.description }); setEditing(false); router.refresh(); })}>
              Save
            </button>
            <button className="text-xs px-2 py-1 bg-gray-200 rounded" onClick={() => { setDraft(seed); setEditing(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={() => setEditing(true)}>Edit</button>
            <button disabled={pending} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded"
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