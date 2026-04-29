import Link from 'next/link';
import { getTimeline } from '@/lib/api/timeline';

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await getTimeline(id);
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Timeline ({rows.length} chapters)</h1>
      <ol className="border-l-2 border-gray-200 pl-4 space-y-3">
        {rows.map((r) => (
          <li key={r.number} className="relative">
            <span className="absolute -left-[1.4rem] top-1 w-3 h-3 rounded-full bg-blue-500" />
            <Link href={`/stories/${id}/chapters/${r.number}` as any} className="font-semibold text-blue-700">
              Ch {r.number}: {r.title}
            </Link>
            <p className="text-sm text-gray-700 mt-1">{r.shortSummary}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}