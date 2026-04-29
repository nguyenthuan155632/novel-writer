import { getDb } from '@novel/db';
import { schema } from '@novel/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { LONG_FORM_CONFIG } from '../config/long-form.ts';

export type Mode = 'safe' | 'semi_auto' | 'full_auto';

export interface ModeContext {
  storyId: string;
  chapterNumber: number;
  userMode: Mode;
}

export async function resolveEffectiveMode(ctx: ModeContext): Promise<{ mode: Mode; reasons: string[] }> {
  const reasons: string[] = [];
  if (ctx.userMode === 'safe' || !LONG_FORM_CONFIG.AUTO_ESCALATE_TO_SAFE_MODE) {
    return { mode: ctx.userMode, reasons: [] };
  }
  if (ctx.chapterNumber === 1) reasons.push('first_chapter');

  const db = getDb();
  const arcRows = await db.select({ startChapter: schema.arcs.startChapter, endChapter: schema.arcs.endChapter })
    .from(schema.arcs)
    .where(and(
      eq(schema.arcs.storyId, ctx.storyId),
      lte(schema.arcs.startChapter, ctx.chapterNumber),
      gte(schema.arcs.endChapter, ctx.chapterNumber),
    ))
    .limit(1);
  if (arcRows.length > 0) {
    if (arcRows[0].startChapter === ctx.chapterNumber) reasons.push('arc_start');
    if (arcRows[0].endChapter === ctx.chapterNumber) reasons.push('arc_end');
  }

  const blocking = await db.select({ id: schema.pendingCanonUpdates.id })
    .from(schema.pendingCanonUpdates)
    .where(and(
      eq(schema.pendingCanonUpdates.storyId, ctx.storyId),
      eq(schema.pendingCanonUpdates.conflictStatus, 'conflict'),
      eq(schema.pendingCanonUpdates.resolution, 'pending'),
    ))
    .limit(1);
  if (blocking.length > 0) reasons.push('blocking_pending');

  return reasons.length > 0 ? { mode: 'safe', reasons } : { mode: ctx.userMode, reasons: [] };
}