import { LONG_FORM_CONFIG } from '../config/long-form.ts';

export interface TriggerContext {
  chapterNumber: number;
  arcEndChapter: number | null;
  arcStartChapter?: number | null;
  arcPhase?: string | null;
  packetHighStakes?: boolean;
  requiredEventTexts?: string[];
  worstValidatorSeverity: 'low' | 'medium' | 'high' | 'critical' | 'none';
}

export function shouldRunReviewer(ctx: TriggerContext): {
  run: boolean;
  reason?:
    | 'arc_boundary'
    | 'arc_climax'
    | 'critical_severity'
    | 'breakthrough_or_death'
    | 'packet_high_stakes';
} {
  if (ctx.worstValidatorSeverity === 'critical' || ctx.worstValidatorSeverity === 'high') {
    return { run: true, reason: 'critical_severity' };
  }
  if (ctx.packetHighStakes) {
    return { run: true, reason: 'packet_high_stakes' };
  }
  if ((ctx.arcPhase ?? '').toLowerCase() === 'climax') {
    return { run: true, reason: 'arc_climax' };
  }
  const isArcBoundary =
    (ctx.arcStartChapter != null && ctx.arcStartChapter === ctx.chapterNumber) ||
    (LONG_FORM_CONFIG.HIGH_STAKES_REVIEW_AT_ARC_END &&
      ctx.arcEndChapter != null &&
      ctx.arcEndChapter === ctx.chapterNumber);
  if (isArcBoundary) {
    return { run: true, reason: 'arc_boundary' };
  }
  if ((ctx.requiredEventTexts ?? []).some(isBreakthroughOrDeathEvent)) {
    return { run: true, reason: 'breakthrough_or_death' };
  }
  return { run: false };
}

function isBreakthroughOrDeathEvent(text: string): boolean {
  return /đột phá|đột phá cảnh giới|breakthrough|character death|chết|tử trận|hi sinh/i.test(text);
}