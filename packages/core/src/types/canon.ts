export const IMPORTANCE_LEVELS = ['low', 'medium', 'high', 'critical', 'locked'] as const;
export type ImportanceLevel = typeof IMPORTANCE_LEVELS[number];

export const CANON_CONFLICT_TYPES = [
  'realm_regression',
  'dead_character_action',
  'locked_field',
  'duplicate_fact',
  'locked_fact',
  'thread_status_invalid',
  'duplicate_faction',
  'destroyed_faction_action',
] as const;
export type CanonConflictType = typeof CANON_CONFLICT_TYPES[number];
