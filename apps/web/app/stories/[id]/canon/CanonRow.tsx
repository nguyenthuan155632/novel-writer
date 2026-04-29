'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocked, type CanonFact } from '@/lib/api/canon-facts';

export function CanonRow({ storyId, fact }: { storyId: string; fact: CanonFact }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const locked = fact.locked || fact.importance === 'locked';
  return (
    <li className="border rounded p-3 text-sm flex justify-between gap-2">
      <div>
        <div><code className="text-xs text-gray-500">{fact.subjectType}/{fact.subjectKey}</code></div>
        <div>{fact.fact}</div>
      </div>
      <button
        disabled={pending}
        onClick={() => start(async () => { await setLocked(storyId, fact.id, !locked); router.refresh(); })}
        className={`text-xs px-2 py-1 rounded h-fit ${locked ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}
      >
        {locked ? 'Unlock' : 'Lock'}
      </button>
    </li>
  );
}