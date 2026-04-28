export interface PromptTemplate {
  agentRole: string;
  version: string;
  render(input: Record<string, unknown>): string;
}

export interface DualPromptTemplate {
  agentRole: string;
  version: string;
  build(input: Record<string, unknown>): { system: string; user: string };
}

const _registry = new Map<string, PromptTemplate | DualPromptTemplate>();

export function registerPrompt(p: PromptTemplate | DualPromptTemplate): void {
  _registry.set(`${p.agentRole}@${p.version}`, p);
}

export function getPrompt(agentRole: string, version: string): PromptTemplate | DualPromptTemplate {
  const k = `${agentRole}@${version}`;
  const p = _registry.get(k);
  if (!p) throw new Error(`Prompt not registered: ${k}`);
  return p;
}

export function listPrompts(): (PromptTemplate | DualPromptTemplate)[] {
  return Array.from(_registry.values());
}