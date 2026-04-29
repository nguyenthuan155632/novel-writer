import { CONTEXT_CONFIG, type ContextConfig } from './context.ts';
import { GENERATION_CONFIG, type GenerationConfig } from './generation.ts';
import { BUDGET_GUARDRAILS, type BudgetGuardrails } from './budget.ts';
import { MODEL_CONFIG, type ModelConfig } from './models.ts';
import { LONG_FORM_CONFIG, type LongFormConfig } from './long-form.ts';

export interface EffectiveConfig {
  context: ContextConfig;
  generation: GenerationConfig;
  budget: BudgetGuardrails;
  model: ModelConfig;
  longForm: LongFormConfig;
}

export interface ConfigOverrides {
  context?: DeepPartial<ContextConfig>;
  generation?: DeepPartial<GenerationConfig>;
  budget?: DeepPartial<BudgetGuardrails>;
  model?: DeepPartial<ModelConfig>;
  longForm?: DeepPartial<LongFormConfig>;
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : Widen<T>;

type Widen<T> = T extends string ? string
  : T extends number ? number
  : T extends boolean ? boolean
  : T extends readonly (infer U)[] ? U[]
  : T;

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  if (Array.isArray(base)) return (patch as T) ?? base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const baseVal = (base as Record<string, unknown>)[k];
    if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
      result[k] = deepMerge(baseVal, v as DeepPartial<typeof baseVal>);
    } else if (v !== undefined) {
      result[k] = v;
    }
  }
  return result as T;
}

export function mergeOverrides(overrides: ConfigOverrides): EffectiveConfig {
  return {
    context: deepMerge(CONTEXT_CONFIG, overrides.context),
    generation: deepMerge(GENERATION_CONFIG, overrides.generation),
    budget: deepMerge(BUDGET_GUARDRAILS, overrides.budget),
    model: deepMerge(MODEL_CONFIG, overrides.model),
    longForm: deepMerge(LONG_FORM_CONFIG, overrides.longForm),
  };
}

export interface StoryOverridesProvider {
  load(storyId: string): Promise<ConfigOverrides>;
}

export async function getEffectiveConfig(
  storyId: string,
  provider: StoryOverridesProvider,
): Promise<EffectiveConfig> {
  const overrides = await provider.load(storyId);
  return mergeOverrides(overrides);
}