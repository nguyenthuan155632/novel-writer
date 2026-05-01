const DEFAULT_MODEL_ID = "google/gemini-2.5-flash";

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
  arc_summary_compactor: DEFAULT_MODEL_ID,
  high_stakes_reviewer: DEFAULT_MODEL_ID,
};

export const MODEL_CONFIG = {
  routes: { ...DEFAULT_MODEL_ROUTES },
  // Prices are per 1M tokens (USD) from OpenRouter API.
  // Models without an exact OpenRouter entry use the closest available variant.
  pricing: {
    // OpenAI
    "openai/gpt-4": { input: 30, cachedInput: 0, output: 60 },
    "openai/gpt-4o": { input: 2.5, cachedInput: 0, output: 10 },
    "openai/gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
    // Google Gemini
    "google/gemini-2.5-flash": { input: 0, cachedInput: 0, output: 0 },
    "google/gemini-2.5-flash-lite": {
      input: 0.1,
      cachedInput: 0.025,
      output: 0.4,
    },
    "google/gemini-2.5-pro": { input: 1.25, cachedInput: 0.31, output: 10.0 },
    // DeepSeek
    "deepseek/deepseek-v3.2": {
      input: 0.252,
      cachedInput: 0.0252,
      output: 0.378,
    },
    "deepseek/deepseek-v4": {
      input: 0.435,
      cachedInput: 0.003625,
      output: 0.87,
    },
    "deepseek/deepseek-v4-pro": {
      input: 0.435,
      cachedInput: 0.003625,
      output: 0.87,
    },
    // Kimi (moonshotai on OpenRouter)
    "kimi/kimi-k2": { input: 0.57, cachedInput: 0, output: 2.3 },
    "kimi/kimi-k2.5": { input: 0.44, cachedInput: 0.22, output: 2 },
    "kimi/kimi-k2.6": { input: 0.75, cachedInput: 0.15, output: 3.5 },
    // Meta Llama 3
    "meta-llama/llama-3-70b-instruct": {
      input: 0.51,
      cachedInput: 0,
      output: 0.74,
    },
    // Mistral
    "mistralai/mistral-large": { input: 2, cachedInput: 0.2, output: 6 },
    "mistralai/mixtral-8x7b": { input: 0.54, cachedInput: 0, output: 0.54 },
    "mistralai/mixtral-8x22b": { input: 2, cachedInput: 0.2, output: 6 },
    // Cohere
    "cohere/command-r": { input: 0.15, cachedInput: 0, output: 0.6 },
    "cohere/command-r-plus": { input: 2.5, cachedInput: 0, output: 10 },
    // Qwen
    "qwen/qwen-2-72b-instruct": { input: 0.36, cachedInput: 0, output: 0.4 },
    "qwen/qwen-2-110b-instruct": { input: 0, cachedInput: 0, output: 0 },
    // GLM
    "glm-5.1": { input: 1.05, cachedInput: 0.525, output: 3.5 },
    // Grok
    "x-ai/grok-3-mini": { input: 0.3, cachedInput: 0.075, output: 0.5 },
    // Ollama
    "gemma4:e2b": { input: 0.0, cachedInput: 0, output: 0.0 },
    "gemma4:e4b": { input: 0.0, cachedInput: 0, output: 0.0 },
    // vMLX
    "mlx-community/Qwen3-4B-4bit": { input: 0.0, cachedInput: 0, output: 0.0 },
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
    role: "bible_generator",
    label: "Bible generator",
    envVar: "BIBLE_MODEL",
    description: "Creates the initial story bible from the premise.",
  },
  {
    role: "saga_planner",
    label: "Saga planner",
    envVar: "SAGA_PLANNER_MODEL",
    description: "Plans large story arcs and saga structure.",
  },
  {
    role: "arc_planner",
    label: "Arc planner",
    envVar: "ARC_PLANNER_MODEL",
    description: "Plans chapter ranges inside a saga.",
  },
  {
    role: "packet_generator",
    label: "Packet generator",
    envVar: "PACKET_MODEL",
    description: "Builds the chapter plan packet.",
  },
  {
    role: "writer",
    label: "Writer",
    envVar: "WRITER_MODEL",
    description: "Writes the chapter prose.",
  },
  {
    role: "auto_fixer",
    label: "Auto fixer",
    envVar: "FIXER_MODEL",
    description: "Applies small validator-requested fixes.",
  },
  {
    role: "llm_validator",
    label: "LLM validator",
    envVar: "VALIDATOR_MODEL",
    description: "Checks style, voice, and soft logic issues.",
  },
  {
    role: "canon_extractor",
    label: "Canon extractor",
    envVar: "EXTRACTOR_MODEL",
    description: "Extracts canon changes from completed chapters.",
  },
  {
    role: "summary_compactor",
    label: "Summary compactor",
    envVar: "COMPACTOR_MODEL",
    description: "Compacts individual chapter summaries.",
  },
  {
    role: "arc_summary_compactor",
    label: "Arc summary compactor",
    envVar: "ARC_SUMMARY_COMPACTOR_MODEL",
    description: "Rolls chapter summaries into arc and saga memory.",
  },
  {
    role: "high_stakes_reviewer",
    label: "High-stakes reviewer",
    envVar: "HIGH_STAKES_MODEL",
    description: "Reviews important chapters with a stronger model.",
  },
];

export const MODEL_HINTS = [
  // OpenAI
  "openai/gpt-4",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  // Google Gemini
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  // DeepSeek
  "deepseek/deepseek-v3.2",
  "deepseek/deepseek-v4",
  "deepseek/deepseek-v4-pro",
  // Kimi
  "kimi/kimi-k2",
  "kimi/kimi-k2.5",
  "kimi/kimi-k2.6",
  // Meta Llama 3
  "meta-llama/llama-3-70b-instruct",
  // Mistral
  "mistralai/mistral-large",
  "mistralai/mixtral-8x7b",
  "mistralai/mixtral-8x22b",
  // Cohere
  "cohere/command-r",
  "cohere/command-r-plus",
  // Qwen
  "qwen/qwen-2-72b-instruct",
  "qwen/qwen-2-110b-instruct",
  // GLM
  "glm-5.1",
  // Grok
  "x-ai/grok-3-mini",
  // Ollama
  "gemma4:e2b",
  "gemma4:e4b",
  // vMLX
  "mlx-community/Qwen3-4B-4bit",
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

export function setModelRoutes(
  routes: Partial<Record<AgentRole, string>>,
): ModelStatus {
  for (const [role, model] of Object.entries(routes) as Array<
    [AgentRole, string]
  >) {
    MODEL_CONFIG.routes[role] = model;
  }
  return getModelStatus();
}

export function resetModelRoutesForTests(): void {
  setModelRoutes(DEFAULT_MODEL_ROUTES);
}

export function pricingFor(
  model: string,
): { input: number; cachedInput: number; output: number } | undefined {
  return MODEL_CONFIG.pricing[model as keyof typeof MODEL_CONFIG.pricing];
}

export function estimateCostUsd(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  },
): number {
  const p = pricingFor(model);
  if (!p) return 0;
  const freshInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    (freshInput / 1_000_000) * p.input +
    (usage.cachedInputTokens / 1_000_000) * p.cachedInput +
    (usage.outputTokens / 1_000_000) * p.output
  );
}
