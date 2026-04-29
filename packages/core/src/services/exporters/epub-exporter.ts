import epub from 'epub-gen-memory';
import { EXPORT_CONFIG } from '../../config/export-config.ts';

export interface EpubExportInput {
  story: { title: string; author: string | null; synopsis: string | null };
  chapters: Array<{ number: number; title: string; content: string }>;
}

export async function renderEpub(input: EpubExportInput): Promise<Buffer> {
  const { story, chapters } = input;
  const buf = await epub(
    {
      title: story.title,
      author: story.author ?? EXPORT_CONFIG.EPUB_AUTHOR_FALLBACK,
      description: story.synopsis ?? '',
      lang: EXPORT_CONFIG.EPUB_LANGUAGE,
    },
    chapters.map(ch => ({
      title: `Chương ${ch.number} — ${ch.title}`,
      content: paragraphsToHtml(ch.content),
    })),
  );
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
    .join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
