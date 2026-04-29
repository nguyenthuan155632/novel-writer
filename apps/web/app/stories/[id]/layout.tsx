import Link from 'next/link';
import type { ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Story { id: string; title: string }

export default async function StoryLayout({
  children, params,
}: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  let story: Story | null = null;
  try { story = await apiFetch<Story>(`/api/stories/${id}`); } catch {}

  if (!story) return <div className="error">Story not found.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <aside>
        <h3 style={{ marginTop: 0 }}>{story.title}</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link href={`/stories/${id}` as any}>Overview</Link>
          <Link href={`/stories/${id}/bible` as any}>Bible</Link>
          <Link href={`/stories/${id}/sagas` as any}>Sagas</Link>
          <Link href={`/stories/${id}/chapters` as any}>Chapters</Link>
          <Link href={`/stories/${id}/pending` as any}>Pending Updates</Link>
          <Link href={`/stories/${id}/settings` as any}>Settings</Link>
        </nav>
        <p style={{ marginTop: 16 }}><Link href="/">← All stories</Link></p>
      </aside>
      <section>{children}</section>
    </div>
  );
}