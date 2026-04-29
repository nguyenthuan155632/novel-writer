import { LONG_FORM_CONFIG } from '../config/long-form.ts';

export type Mode = 'safe' | 'semi_auto' | 'full_auto';

export interface ModeContext {
  storyId: string;
  chapterNumber: number;
  userMode: Mode;
}

export interface ArcBoundary {
  startChapter: number | null;
  endChapter: number | null;
}

export interface ModeEscalationDeps {
  getArcBoundaryForChapter(storyId: string, chapterNumber: number): Promise<ArcBoundary | null>;
  hasBlockingPendingUpdates(storyId: string): Promise<boolean>;
}

export async function resolveEffectiveMode(ctx: ModeContext, deps: ModeEscalationDeps): Promise<{ mode: Mode; reasons: string[] }> {
  const reasons: string[] = [];
  if (ctx.userMode === 'safe' || !LONG_FORM_CONFIG.AUTO_ESCALATE_TO_SAFE_MODE) {
    return { mode: ctx.userMode, reasons: [] };
  }
  if (ctx.chapterNumber === 1) reasons.push('first_chapter');

  const arc = await deps.getArcBoundaryForChapter(ctx.storyId, ctx.chapterNumber);
  if (arc) {
    if (arc.startChapter === ctx.chapterNumber) reasons.push('arc_start');
    if (arc.endChapter === ctx.chapterNumber) reasons.push('arc_end');
  }

  const hasBlocking = await deps.hasBlockingPendingUpdates(ctx.storyId);
  if (hasBlocking) reasons.push('blocking_pending');

  return reasons.length > 0 ? { mode: 'safe', reasons } : { mode: ctx.userMode, reasons: [] };
}