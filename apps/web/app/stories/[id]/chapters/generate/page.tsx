import Link from 'next/link';
import { GenerateForm } from '../generate-form';

export default async function GenerateChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
      <GenerateForm storyId={id} />
    </>
  );
}
