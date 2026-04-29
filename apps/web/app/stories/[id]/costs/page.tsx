import { getSummary, getByAgent, getByChapter } from '@/lib/api/costs';

function Stat({ label, used, cap, pct }: { label: string; used: number; cap: number; pct: number }) {
  const color = pct >= 100 ? 'red' : pct >= 80 ? 'amber' : 'green';
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">${used.toFixed(4)} <span className="text-sm text-gray-400">/ ${cap}</span></div>
      <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
        <div className={`h-full bg-${color}-500`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default async function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [summary, byAgent, byChapter] = await Promise.all([getSummary(id), getByAgent(id), getByChapter(id)]);
  const dailyPct = (summary.usage.dailyUsd / summary.caps.PER_STORY_DAILY_CAP_USD) * 100;
  const monthlyPct = (summary.usage.monthlyUsd / summary.caps.PER_STORY_MONTHLY_CAP_USD) * 100;
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Cost dashboard</h1>
      <section className="grid grid-cols-2 gap-4 mb-8">
        <Stat label="Today" used={summary.usage.dailyUsd} cap={summary.caps.PER_STORY_DAILY_CAP_USD} pct={dailyPct} />
        <Stat label="Last 30 days" used={summary.usage.monthlyUsd} cap={summary.caps.PER_STORY_MONTHLY_CAP_USD} pct={monthlyPct} />
      </section>
      <section className="mb-8">
        <h2 className="font-medium mb-2">By agent (last 30d)</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left"><tr><th>Agent</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
          <tbody>
            {byAgent.map((r) => <tr key={r.agent} className="border-b"><td>{r.agent}</td><td>{r.callCount}</td><td>{r.tokens.toLocaleString()}</td><td>${Number(r.cost).toFixed(4)}</td></tr>)}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-medium mb-2">By chapter</h2>
        <ul className="text-sm grid grid-cols-2 gap-x-6">
          {byChapter.map((r) => <li key={r.chapterNumber}>Ch {r.chapterNumber}: ${Number(r.cost).toFixed(4)}</li>)}
        </ul>
      </section>
    </div>
  );
}