export function shouldRefreshRollingSummary(input: {
  chapterNumber: number;
  startChapter: number | null;
  endChapter: number | null;
  everyN: number;
}): boolean {
  if (input.endChapter != null && input.chapterNumber >= input.endChapter) return true;
  const start = input.startChapter ?? 1;
  const position = input.chapterNumber - start + 1;
  if (position < 1) return false;
  return position % Math.max(1, input.everyN) === 0;
}
