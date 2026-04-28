export interface GenerateChapterJobData {
  storyId: string;
  chapterNumber: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
  retryAttempt?: number;
}

export interface GenerateChapterJobResult {
  chapterId: string;
  status: 'completed' | 'paused_pending_updates' | 'failed';
  attempts: number;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
}