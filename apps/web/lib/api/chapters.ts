import { apiFetch } from '@/lib/api-client';

export interface ChapterSummary {
  id: string;
  chapterNumber: number;
  title: string | null;
  status: string;
  wordCount: number;
}

export interface ChapterDetail {
  id: string;
  storyId: string;
  arcId: string | null;
  chapterNumber: number;
  title: string | null;
  content: string | null;
  summary: string | null;
  status: string;
  wordCount: number;
  validationStatus: string;
  packetAuditStatus: string;
  deterministicValidation: unknown;
  llmValidationId: string | null;
  contextCacheKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponse {
  jobId: string;
  storyId: string;
  chapterNumber: number;
}

export interface JobStatus {
  jobId: string;
  state: string;
  progress: unknown;
}

export async function fetchChapters(storyId: string): Promise<ChapterSummary[]> {
  const data = await apiFetch<{ chapters: ChapterSummary[] }>(`/api/stories/${storyId}/chapters`);
  return data.chapters;
}

export async function fetchChapter(storyId: string, chapterNumber: number): Promise<ChapterDetail> {
  const data = await apiFetch<{ chapter: ChapterDetail }>(`/api/stories/${storyId}/chapters/${chapterNumber}`);
  return data.chapter;
}

export async function generateChapter(
  storyId: string,
  chapterNumber: number,
  mode: 'safe' | 'semi_auto' | 'full_auto' = 'safe',
): Promise<GenerateResponse> {
  return apiFetch<GenerateResponse>(`/api/stories/${storyId}/chapters/generate`, {
    method: 'POST',
    body: JSON.stringify({ chapterNumber, mode }),
  });
}

export async function fetchChapterStatus(
  storyId: string,
  chapterNumber: number,
): Promise<JobStatus | null> {
  try {
    return await apiFetch<JobStatus>(`/api/stories/${storyId}/chapters/${chapterNumber}/status`);
  } catch {
    return null;
  }
}