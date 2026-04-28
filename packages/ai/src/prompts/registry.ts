export interface PromptTemplate {
  agentRole: string;
  version: string;
  render(input: Record<string, unknown>): string;
}

const _registry = new Map<string, PromptTemplate>();

export function registerPrompt(p: PromptTemplate): void {
  _registry.set(`${p.agentRole}@${p.version}`, p);
}

export function getPrompt(agentRole: string, version: string): PromptTemplate {
  const k = `${agentRole}@${version}`;
  const p = _registry.get(k);
  if (!p) throw new Error(`Prompt not registered: ${k}`);
  return p;
}

export function listPrompts(): PromptTemplate[] {
  return Array.from(_registry.values());
}