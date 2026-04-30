import { getSummary, getByAgent, getByChapter } from '@/lib/api/costs';

function Stat({ label, used, cap, pct }: { label: string; used: number; cap: number; pct: number }) {
  const color = pct >= 100 ? 'red' : pct >= 80 ? 'amber' : 'green';
  const barColor = color === 'red' ? '#a33a2a' : color === 'amber' ? '#b8872f' : '#3f6f59';
  return (
    <div className="studio-panel">
      <div className="muted">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 750 }}>${used.toFixed(4)} <span className="muted" style={{ fontSize: 14 }}>/ ${cap}</span></div>
      <div style={{ background: '#eadfce', borderRadius: 999, height: 8, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ background: barColor, height: '100%', width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default async function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let summary: Awaited<ReturnType<typeof getSummary>> | null = null;
  let byAgent: Awaited<ReturnType<typeof getByAgent>> = [];
  let byChapter: Awaited<ReturnType<typeof getByChapter>> = [];
  let error: string | null = null;
  try {
    [summary, byAgent, byChapter] = await Promise.all([getSummary(id), getByAgent(id), getByChapter(id)]);
  } catch (e) {
    error = (e as Error).message;
  }
  if (!summary) {
    return (
      <>
        <header className="studio-header">
          <div>
            <p className="studio-kicker">Budget</p>
            <h1>Cost dashboard</h1>
            <p className="studio-subtitle">Track model spend across recent chapter production.</p>
          </div>
        </header>
        {error && <p className="error">Failed to load costs: {error}</p>}
      </>
    );
  }
  const dailyPct = (summary.usage.dailyUsd / summary.caps.PER_STORY_DAILY_CAP_USD) * 100;
  const monthlyPct = (summary.usage.monthlyUsd / summary.caps.PER_STORY_MONTHLY_CAP_USD) * 100;
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Budget</p>
          <h1>Cost dashboard</h1>
          <p className="studio-subtitle">Track model spend across recent chapter production.</p>
        </div>
      </header>
      <section className="studio-columns">
        <Stat label="Today" used={summary.usage.dailyUsd} cap={summary.caps.PER_STORY_DAILY_CAP_USD} pct={dailyPct} />
        <Stat label="Last 30 days" used={summary.usage.monthlyUsd} cap={summary.caps.PER_STORY_MONTHLY_CAP_USD} pct={monthlyPct} />
      </section>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>By agent (last 30d)</h2>
        <table className="studio-table">
          <thead><tr><th>Agent</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
          <tbody>
            {byAgent.map((r) => <tr key={r.agent}><td>{r.agent}</td><td>{r.callCount}</td><td>{r.tokens.toLocaleString()}</td><td>${Number(r.cost).toFixed(4)}</td></tr>)}
          </tbody>
        </table>
      </section>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>By chapter</h2>
        <ul className="list-clean" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {byChapter.map((r) => <li key={r.chapterNumber}>Ch {r.chapterNumber}: ${Number(r.cost).toFixed(4)}</li>)}
        </ul>
      </section>
    </>
  );
}
