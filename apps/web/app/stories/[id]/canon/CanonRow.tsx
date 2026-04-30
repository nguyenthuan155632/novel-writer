'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocked, type CanonFact } from '@/lib/api/canon-facts';

export function CanonRow({ storyId, fact }: { storyId: string; fact: CanonFact }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const locked = fact.locked || fact.importance === 'locked';
  const subject = [fact.subjectType, fact.subjectKey].filter(Boolean).join('/');
  return (
    <li className="studio-card fact-row">
      <div className="fact-row-body">
        {subject && <div><code className="muted">{subject}</code></div>}
        <div>{fact.fact}</div>
      </div>
      <button
        disabled={pending}
        onClick={() => start(async () => { await setLocked(storyId, fact.id, !locked); router.refresh(); })}
        className={locked ? 'danger' : ''}
      >
        {locked ? 'Unlock' : 'Lock'}
      </button>
    </li>
  );
}
