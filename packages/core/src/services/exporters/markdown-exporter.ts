export interface MarkdownExportInput {
  story: { title: string; author: string | null; synopsis: string | null };
  chapters: Array<{ number: number; title: string; content: string }>;
}

export function renderMarkdown(input: MarkdownExportInput): string {
  const { story, chapters } = input;
  const parts: string[] = [`# ${story.title}`, ''];
  if (story.author) parts.push(`_by ${story.author}_`, '');
  if (story.synopsis) parts.push(story.synopsis, '');
  parts.push('---', '');
  for (const ch of chapters) {
    parts.push(`## Chương ${ch.number} — ${ch.title}`, '', ch.content, '');
  }
  return parts.join('\n');
}
