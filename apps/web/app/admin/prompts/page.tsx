export const dynamic = 'force-dynamic';

import { listPromptVersions } from '@/lib/api/prompt-versions';

export default async function PromptVersionsList() {
  const rows = await listPromptVersions();
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.agentRole] ??= []).push(r);
    return acc;
  }, {} as Record<string, typeof rows>);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Prompt versions</h1>
      {Object.entries(grouped).map(([role, items]) => (
        <section key={role}>
          <h2 className="font-medium">
            <a href={`/admin/prompts/${role}`} style={{ color: '#2563eb' }}>{role}</a>
            <span style={{ color: '#666', marginLeft: 8 }}>{items.length} versions</span>
          </h2>
          <ul style={{ paddingLeft: 16, fontSize: 14 }}>
            {items.map(v => (
              <li key={v.id}>{v.version}{v.active ? ' (active)' : ''}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}