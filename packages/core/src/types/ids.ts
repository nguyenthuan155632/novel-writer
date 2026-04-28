declare const brand: unique symbol;
export type Brand<T, B> = T & { readonly [brand]: B };

export type StoryId = Brand<string, 'StoryId'>;
export type ChapterId = Brand<string, 'ChapterId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type ArcId = Brand<string, 'ArcId'>;
export type SagaId = Brand<string, 'SagaId'>;
export type FactionId = Brand<string, 'FactionId'>;
export type BloodlineId = Brand<string, 'BloodlineId'>;
export type CanonFactId = Brand<string, 'CanonFactId'>;
export type SeedId = Brand<string, 'SeedId'>;
export type PendingUpdateId = Brand<string, 'PendingUpdateId'>;
export type ChapterPacketId = Brand<string, 'ChapterPacketId'>;
export type ContextPacketId = Brand<string, 'ContextPacketId'>;
export type PromptVersionId = Brand<string, 'PromptVersionId'>;
export type ValidationId = Brand<string, 'ValidationId'>;
export type LlmCallId = Brand<string, 'LlmCallId'>;

export const asStoryId = (s: string): StoryId => s as StoryId;
export const asChapterId = (s: string): ChapterId => s as ChapterId;
