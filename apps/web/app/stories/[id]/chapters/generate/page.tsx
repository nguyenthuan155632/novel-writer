import Link from 'next/link';
import { GenerateForm } from '../generate-form';
import { apiFetch } from '@/lib/api-client';

export default async function GenerateChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let nextChapter = 1;
  try {
    const data = await apiFetch<{ chapters: { chapterNumber: number }[] }>(`/api/stories/${id}/chapters`);
    if (data.chapters && data.chapters.length > 0) {
      nextChapter = Math.max(...data.chapters.map(c => c.chapterNumber)) + 1;
    }
  } catch (e) {
    // Ignore error
  }

  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Draft pipeline</p>
          <h1>Generate Chapter</h1>
          <p className="studio-subtitle">Queue the next chapter with the generation mode that fits the current planning state.</p>
        </div>
        <Link href={`/stories/${id}/chapters` as any}>Back to chapters</Link>
      </header>
      <GenerateForm storyId={id} initialChapterNumber={nextChapter} />
    </>
  );
}
