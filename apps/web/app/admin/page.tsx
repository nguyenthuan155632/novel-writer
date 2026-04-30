export const dynamic = 'force-dynamic';

import { getAdminMetrics } from '@/lib/api/admin-metrics';
import ModelSettings from './model-settings';

export default async function AdminPage() {
  const metrics = await getAdminMetrics();

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-semibold mb-6">Admin</h1>

      <ModelSettings />

      {/* 1. Cache hit rate */}
      {/* <section className="mb-8 admin-section">
        <h2 className="font-medium mb-2">Cache hit rate</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="pb-1">Tier</th>
              <th className="pb-1">Builds</th>
              <th className="pb-1">Cached tokens</th>
              <th className="pb-1">Total tokens</th>
              <th className="pb-1">Hit %</th>
            </tr>
          </thead>
          <tbody>
            {metrics.cacheHitRates.map((r) => (
              <tr key={r.tier} className="border-b">
                <td className="py-1">{r.tier}</td>
                <td className="py-1">{r.totalBuilds.toLocaleString()}</td>
                <td className="py-1">{r.cachedTokens.toLocaleString()}</td>
                <td className="py-1">{r.totalInputTokens.toLocaleString()}</td>
                <td className="py-1">{r.hitRatePct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section> */}

      {/* 2. Cost rolling 7-day */}
      {/* <section className="mb-8">
        <h2 className="font-medium mb-2">Cost (rolling 7 days)</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="pb-1">Date</th>
              <th className="pb-1">Chapters</th>
              <th className="pb-1">Total $</th>
              <th className="pb-1">$/chapter</th>
            </tr>
          </thead>
          <tbody>
            {metrics.costRolling7d.map((r) => (
              <tr key={r.date} className="border-b">
                <td className="py-1">{r.date}</td>
                <td className="py-1">{r.chapterCount}</td>
                <td className="py-1">${Number(r.totalCostUsd).toFixed(4)}</td>
                <td className="py-1">${Number(r.costPerChapterUsd).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section> */}

      {/* 3. Validator failures */}
      {/* <section className="mb-8">
        <h2 className="font-medium mb-2">Validator failures</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="pb-1">Check</th>
              <th className="pb-1">Severity</th>
              <th className="pb-1">Count</th>
            </tr>
          </thead>
          <tbody>
            {metrics.validatorFailures.map((r) => (
              <tr key={r.checkId} className="border-b">
                <td className="py-1">{r.checkId}</td>
                <td className="py-1">{r.severity}</td>
                <td className="py-1">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section> */}

      {/* 4. Auto-fixer stat */}
      {/* <section className="mb-8">
        <h2 className="font-medium mb-2">Auto-fixer</h2>
        <p className="text-sm">
          Attempted: <strong>{metrics.autoFix.attempted}</strong> / Succeeded:{' '}
          <strong>{metrics.autoFix.succeeded}</strong> / Rate:{' '}
          <strong>{metrics.autoFix.successRatePct.toFixed(1)}%</strong>
        </p>
      </section> */}

      {/* 5. Pending canon aging */}
      {/* <section className="mb-8">
        <h2 className="font-medium mb-2">Pending canon aging</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="pb-1">Age bucket</th>
              <th className="pb-1">Count</th>
            </tr>
          </thead>
          <tbody>
            {metrics.pendingCanonAging.map((r) => (
              <tr key={r.ageBucket} className="border-b">
                <td className="py-1">{r.ageBucket}</td>
                <td className="py-1">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section> */}
    </div>
  );
}
