const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export interface PromptVersionRow {
  id: string;
  agentRole: string;
  version: string;
  active: boolean;
  createdAt: string;
}

export interface PromptVersionFull extends PromptVersionRow {
  template: string;
}

export async function listPromptVersions(): Promise<PromptVersionRow[]> {
  const r = await fetch(`${BASE}/admin/prompt-versions`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`list prompt versions failed: ${r.status}`);
  return r.json();
}

export async function getPromptVersionsByRole(role: string): Promise<PromptVersionFull[]> {
  const r = await fetch(`${BASE}/admin/prompt-versions/${encodeURIComponent(role)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`get prompt versions failed: ${r.status}`);
  return r.json();
}