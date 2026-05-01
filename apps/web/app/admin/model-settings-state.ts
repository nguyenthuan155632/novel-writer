import type { ModelOption, ModelRoutes } from '@/lib/api/models';

export function fillAllModelRoutes(options: Pick<ModelOption, 'role'>[], model: string): Partial<ModelRoutes> {
  return Object.fromEntries(options.map((option) => [option.role, model])) as Partial<ModelRoutes>;
}
