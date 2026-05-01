import type { GenreDef, StoryOptions } from '@novel/core';
import type { SagaPlannerOutput } from '../schemas/saga.ts';

export interface SagaPlannerInput {
  storyId: string;
  bibleCompact: string;
  targetChapters: number;
  genreDef: GenreDef;
  storyOptions: StoryOptions;
}

export interface SagaPlannerResult {
  output: SagaPlannerOutput;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
}
