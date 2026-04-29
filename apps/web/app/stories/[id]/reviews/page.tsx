import { listReviews } from '@/lib/api/reviews';

export default async function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await listReviews(id);
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">High-stakes reviews</h1>
      {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className={`border rounded p-4 ${r.approve === 'true' ? 'border-green-300' : 'border-red-300'}`}>
            <div className="flex justify-between text-sm">
              <span>Trigger: <code>{r.triggerReason}</code> · {r.approve === 'true' ? '✓ approved' : '✗ not approved'}</span>
              <span className="text-gray-500">${Number(r.costUsd).toFixed(4)} · {new Date(r.createdAt).toLocaleString()}</span>
            </div>
            {r.concerns.length > 0 && (
              <div className="mt-2">
                <h3 className="font-medium text-sm">Concerns</h3>
                <ul className="text-sm list-disc pl-6">
                  {r.concerns.map((c, i) => (
                    <li key={i}><span className="uppercase text-xs text-amber-700">[{c.severity}/{c.category}]</span> {c.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.recommendedActions.length > 0 && (
              <div className="mt-2">
                <h3 className="font-medium text-sm">Recommended actions</h3>
                <ul className="text-sm list-disc pl-6">
                  {r.recommendedActions.map((a, i) => <li key={i}><code>{a.action}</code>: {a.rationale}</li>)}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}