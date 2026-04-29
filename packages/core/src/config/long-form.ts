export const LONG_FORM_CONFIG = {
  SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 20,
  ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 5,
  SAGA_COUNT_RANGE: { min: 5, max: 8 } as const,
  SEEDS_PER_SAGA_PLAN_RANGE: { min: 10, max: 30 } as const,
  ARC_COUNT_PER_SAGA_RANGE: { min: 2, max: 5 } as const,
  AUTO_ESCALATE_TO_SAFE_MODE: true,
  HIGH_STAKES_REVIEW_AT_ARC_END: true,
} as const;

export type LongFormConfig = typeof LONG_FORM_CONFIG;