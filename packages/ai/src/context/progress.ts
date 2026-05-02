export type ProgressPhase =
  | "setup"
  | "development"
  | "climax_buildup"
  | "climax";

export type ProgressWindowSource =
  | "planned_range"
  | "story_target_fallback"
  | "saga_end_fallback";

export type ProgressWindow = {
  percent: number;
  range: string;
  startChapter: number;
  endChapter: number;
  source: ProgressWindowSource;
};

export function computeProgressPercent(
  chapterNumber: number,
  startChapter: number,
  endChapter: number,
): number {
  const span = Math.max(1, endChapter - startChapter + 1);
  const position = chapterNumber - startChapter + 1;
  const clamped = Math.max(0, Math.min(span, position));
  return Math.round((clamped / span) * 100);
}

export function computeProgressWindow(input: {
  chapterNumber: number;
  startChapter?: number | null;
  endChapter?: number | null;
  fallbackEndChapter?: number | null;
  fallbackSource?: Exclude<ProgressWindowSource, "planned_range">;
}): ProgressWindow | null {
  const hasPlannedEnd = input.endChapter != null;
  const startChapter = input.startChapter ?? 1;
  const rawEndChapter = input.endChapter ?? input.fallbackEndChapter ?? null;
  if (rawEndChapter == null) return null;

  const endChapter = Math.max(startChapter, rawEndChapter);
  const span = Math.max(1, endChapter - startChapter + 1);
  const position = Math.max(
    0,
    Math.min(span, input.chapterNumber - startChapter + 1),
  );

  return {
    percent: computeProgressPercent(
      input.chapterNumber,
      startChapter,
      endChapter,
    ),
    range: `${position}/${span}`,
    startChapter,
    endChapter,
    source: hasPlannedEnd
      ? "planned_range"
      : (input.fallbackSource ?? "story_target_fallback"),
  };
}

export function progressPhaseFor(percent: number | null): ProgressPhase | null {
  if (percent == null) return null;
  if (percent < 30) return "setup";
  if (percent < 60) return "development";
  if (percent < 80) return "climax_buildup";
  return "climax";
}
