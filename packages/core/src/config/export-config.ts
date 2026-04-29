export const EXPORT_CONFIG = {
  SYNC_CHAPTER_THRESHOLD: 200,
  SUPPORTED_FORMATS: ['markdown', 'epub'] as const,
  EPUB_LANGUAGE: 'vi',
  EPUB_AUTHOR_FALLBACK: 'AI Novel Factory',
} as const;

export type ExportFormat = (typeof EXPORT_CONFIG.SUPPORTED_FORMATS)[number];
