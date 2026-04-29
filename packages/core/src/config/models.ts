export const MODEL_CONFIG = {
  routes: {
    bible_generator: process.env.BIBLE_MODEL ?? 'google/gemini-2.5-pro',
    saga_planner: process.env.SAGA_PLANNER_MODEL ?? 'google/gemini-2.5-pro',
    arc_planner: process.env.ARC_PLANNER_MODEL ?? 'google/gemini-2.5-flash',
    packet_generator: process.env.PACKET_MODEL ?? 'google/gemini-2.5-flash-lite',
    writer: process.env.WRITER_MODEL ?? 'google/gemini-2.5-flash-lite',
    auto_fixer: process.env.FIXER_MODEL ?? 'google/gemini-2.5-flash-lite',
    llm_validator: process.env.VALIDATOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    canon_extractor: process.env.EXTRACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    summary_compactor: process.env.COMPACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    high_stakes_reviewer: process.env.HIGH_STAKES_MODEL ?? 'google/gemini-2.5-flash',
  },
  pricing: {
    'google/gemini-2.5-flash-lite': { input: 0.10, cachedInput: 0.025, output: 0.40 },
    'google/gemini-2.5-flash':      { input: 0.30, cachedInput: 0.075, output: 2.50 },
    'google/gemini-2.5-pro':        { input: 1.25, cachedInput: 0.31,  output: 10.00 },
  },
} as const;

export type AgentRole = keyof typeof MODEL_CONFIG.routes;
export type ModelConfig = typeof MODEL_CONFIG;

export function modelFor(role: AgentRole): string {
  return MODEL_CONFIG.routes[role];
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