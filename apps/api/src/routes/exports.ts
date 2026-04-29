import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, chapters } from '@novel/db/schema';
import { eq, and, isNotNull, asc } from 'drizzle-orm';
import { EXPORT_CONFIG, renderMarkdown, renderEpub } from '@novel/core';

const StoryParam = z.object({ storyId: z.string().uuid() });
const ExportBody = z.object({
  format: z.enum(EXPORT_CONFIG.SUPPORTED_FORMATS),
});

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'story';
}

const exportsRoute: FastifyPluginCallback = (app, _opts, done) => {
  app.post<{ Params: { storyId: string } }>(
    '/api/stories/:storyId/exports',
    async (req, reply) => {
      const { storyId } = StoryParam.parse(req.params);

      let body: { format: 'markdown' | 'epub' };
      try {
        body = ExportBody.parse(req.body);
      } catch {
        return reply.status(400).send({ error: 'invalid_format', message: `format must be one of: ${EXPORT_CONFIG.SUPPORTED_FORMATS.join(', ')}` });
      }

      const db = getDb();

      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);

      if (!story) {
        return reply.status(404).send({ error: 'not_found', message: 'Story not found' });
      }

      const completedChapters = await db
        .select({
          number: chapters.chapterNumber,
          title: chapters.title,
          content: chapters.content,
        })
        .from(chapters)
        .where(
          and(
            eq(chapters.storyId, storyId),
            isNotNull(chapters.content),
          )
        )
        .orderBy(asc(chapters.chapterNumber));

      const exportChapters = completedChapters
        .filter(ch => ch.content && ch.content.trim().length > 0)
        .map(ch => ({
          number: ch.number,
          title: ch.title ?? `Chương ${ch.number}`,
          content: ch.content!,
        }));

      if (exportChapters.length > EXPORT_CONFIG.SYNC_CHAPTER_THRESHOLD) {
        return reply.status(202).send({
          status: 'queued',
          message: 'use generate-export worker job',
        });
      }

      const exportInput = {
        story: {
          title: story.title,
          author: null,
          synopsis: story.premise,
        },
        chapters: exportChapters,
      };

      const storySlug = slug(story.title);

      if (body.format === 'markdown') {
        const content = renderMarkdown(exportInput);
        const filename = `${storySlug}.md`;
        return reply
          .status(200)
          .header('Content-Type', 'text/markdown; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(content);
      } else {
        const buf = await renderEpub(exportInput);
        const filename = `${storySlug}.epub`;
        return reply
          .status(200)
          .header('Content-Type', 'application/epub+zip')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(buf);
      }
    }
  );

  done();
};

export default exportsRoute;
