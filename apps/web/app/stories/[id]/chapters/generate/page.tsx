import Link from 'next/link';
import { GenerateForm } from '../generate-form';

export default async function GenerateChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <h1>Generate Chapter</h1>
      <p><Link href={`/stories/${id}/chapters` as any}>← Back to chapters</Link></p>
      <GenerateForm storyId={id} />
    </div>
  );
}