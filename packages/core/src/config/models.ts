const DEFAULT_MODEL_ID = 'google/gemini-2.5-flash';

const DEFAULT_MODEL_ROUTES = {
  bible_generator: DEFAULT_MODEL_ID,
  saga_planner: DEFAULT_MODEL_ID,
  arc_planner: DEFAULT_MODEL_ID,
  packet_generator: DEFAULT_MODEL_ID,
  writer: DEFAULT_MODEL_ID,
  auto_fixer: DEFAULT_MODEL_ID,
  llm_validator: DEFAULT_MODEL_ID,
  canon_extractor: DEFAULT_MODEL_ID,
  summary_compactor: DEFAULT_MODEL_ID,
  high_stakes_reviewer: DEFAULT_MODEL_ID,
};

export const MODEL_CONFIG = {
  routes: { ...DEFAULT_MODEL_ROUTES },
  pricing: {
    'google/gemini-2.5-flash':      { input: 0, cachedInput: 0, output: 0 },
    'google/gemini-2.5-flash-lite': { input: 0.10, cachedInput: 0.025, output: 0.40 },
    'google/gemini-2.5-pro':        { input: 1.25, cachedInput: 0.31,  output: 10.00 },
  },
};

export type AgentRole = keyof typeof MODEL_CONFIG.routes;
export type ModelConfig = typeof MODEL_CONFIG;
export type ModelRoutes = Record<AgentRole, string>;

export interface ModelOption {
  role: AgentRole;
  label: string;
  envVar: string;
  description: string;
}

export interface ModelStatus {
  routes: ModelRoutes;
  options: ModelOption[];
  hints: string[];
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    role: 'bible_generator',
    label: 'Bible generator',
    envVar: 'BIBLE_MODEL',
    description: 'Creates the initial story bible from the premise.',
  },
  {
    role: 'saga_planner',
    label: 'Saga planner',
    envVar: 'SAGA_PLANNER_MODEL',
    description: 'Plans large story arcs and saga structure.',
  },
  {
    role: 'arc_planner',
    label: 'Arc planner',
    envVar: 'ARC_PLANNER_MODEL',
    description: 'Plans chapter ranges inside a saga.',
  },
  {
    role: 'packet_generator',
    label: 'Packet generator',
    envVar: 'PACKET_MODEL',
    description: 'Builds the chapter plan packet.',
  },
  {
    role: 'writer',
    label: 'Writer',
    envVar: 'WRITER_MODEL',
    description: 'Writes the chapter prose.',
  },
  {
    role: 'auto_fixer',
    label: 'Auto fixer',
    envVar: 'FIXER_MODEL',
    description: 'Applies small validator-requested fixes.',
  },
  {
    role: 'llm_validator',
    label: 'LLM validator',
    envVar: 'VALIDATOR_MODEL',
    description: 'Checks style, voice, and soft logic issues.',
  },
  {
    role: 'canon_extractor',
    label: 'Canon extractor',
    envVar: 'EXTRACTOR_MODEL',
    description: 'Extracts canon changes from completed chapters.',
  },
  {
    role: 'summary_compactor',
    label: 'Summary compactor',
    envVar: 'COMPACTOR_MODEL',
    description: 'Compacts chapter and arc summaries.',
  },
  {
    role: 'high_stakes_reviewer',
    label: 'High-stakes reviewer',
    envVar: 'HIGH_STAKES_MODEL',
    description: 'Reviews important chapters with a stronger model.',
  },
];

export const MODEL_HINTS = [
  'glm-5.1',
  'deepseek-v4-pro',
  'kimi-k2.6',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro',
];

export function modelFor(role: AgentRole): string {
  return MODEL_CONFIG.routes[role];
}

export function getModelStatus(): ModelStatus {
  return {
    routes: { ...MODEL_CONFIG.routes },
    options: MODEL_OPTIONS,
    hints: MODEL_HINTS,
  };
}

export function setModelRoutes(routes: Partial<Record<AgentRole, string>>): ModelStatus {
  for (const [role, model] of Object.entries(routes) as Array<[AgentRole, string]>) {
    MODEL_CONFIG.routes[role] = model;
  }
  return getModelStatus();
}

export function resetModelRoutesForTests(): void {
  setModelRoutes(DEFAULT_MODEL_ROUTES);
}

export function pricingFor(model: string): { input: number; cachedInput: number; output: number } | undefined {
  return MODEL_CONFIG.pricing[model as keyof typeof MODEL_CONFIG.pricing];
}

export function estimateCostUsd(model: string, usage: {
  inputTokens: number; outputTokens: number; cachedInputTokens: number;
}): number {
  const p = pricingFor(model);
  if (!p) return 0;
  const freshInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    (freshInput / 1_000_000) * p.input +
    (usage.cachedInputTokens / 1_000_000) * p.cachedInput +
    (usage.outputTokens / 1_000_000) * p.output
  );
}
