import { apiFetch } from '../api-client';

export type AgentRole =
  | 'bible_generator'
  | 'saga_planner'
  | 'arc_planner'
  | 'packet_generator'
  | 'writer'
  | 'auto_fixer'
  | 'llm_validator'
  | 'canon_extractor'
  | 'summary_compactor'
  | 'arc_summary_compactor'
  | 'high_stakes_reviewer';

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

export function getModelStatus(): Promise<ModelStatus> {
  return apiFetch<ModelStatus>('/api/admin/models');
}

export function updateModelRoutes(routes: Partial<ModelRoutes>): Promise<ModelStatus> {
  return apiFetch<ModelStatus>('/api/admin/models', {
    method: 'PUT',
    body: JSON.stringify({ routes }),
  });
}
