import { LONG_FORM_CONFIG } from '../config/long-form.ts';

export interface TriggerContext {
  chapterNumber: number;
  arcEndChapter: number | null;
  worstValidatorSeverity: 'low' | 'medium' | 'high' | 'critical' | 'none';
}

export function shouldRunReviewer(ctx: TriggerContext): { run: boolean; reason?: 'arc_end' | 'critical_severity' } {
  if (ctx.worstValidatorSeverity === 'critical') return { run: true, reason: 'critical_severity' };
  if (LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END && ctx.arcEndChapter === ctx.chapterNumber) {
    return { run: true, reason: 'arc_end' };
  }
  return { run: false };
}