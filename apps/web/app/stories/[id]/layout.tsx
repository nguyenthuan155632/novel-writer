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
    <div className="story-workspace">
      <aside className="story-sidebar">
        <h3>{story.title}</h3>
        <nav className="story-nav">
          <Link href={`/stories/${id}` as any}>Overview</Link>
          <Link href={`/stories/${id}/bible` as any}>Bible</Link>
          <Link href={`/stories/${id}/sagas` as any}>Sagas</Link>
          <Link href={`/stories/${id}/chapters` as any}>Chapters</Link>
          <Link href={`/stories/${id}/canon` as any}>Canon</Link>
          <Link href={`/stories/${id}/timeline` as any}>Timeline</Link>
          <Link href={`/stories/${id}/seeds` as any}>Seeds</Link>
          <Link href={`/stories/${id}/costs` as any}>Costs</Link>
          <Link href={`/stories/${id}/pending` as any}>Pending Updates</Link>
          <Link href={`/stories/${id}/settings` as any}>Settings</Link>
        </nav>
        <p className="story-back-link"><Link href="/">All stories</Link></p>
      </aside>
      <section className="studio-page">{children}</section>
    </div>
  );
}
