import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { chapters } from '@novel/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import {
  enqueueGenerateChapter,
  getGenerateChapterStatus,
} from '../services/queue-client.js';

const ChapterParams = z.object({
  storyId: z.string().uuid(),
});

const ChapterDetailParams = z.object({
  storyId: z.string().uuid(),
  chapterNumber: z.coerce.number().int().positive(),
});

const PostGenerateBody = z.object({
  chapterNumber: z.number().int().positive(),
  mode: z.enum(['safe', 'semi_auto', 'full_auto']).default('safe'),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/api/stories/:storyId/chapters', async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const db = getDb();
    const rows = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        status: chapters.status,
        wordCount: chapters.wordCount,
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));
    return reply.send({ chapters: rows });
  });

  app.get('/api/stories/:storyId/chapters/:chapterNumber', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    const db = getDb();
    const [row] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: 'chapter_not_found' });
    return reply.send({ chapter: row });
  });

  app.post('/api/stories/:storyId/chapters/generate', async (req, reply) => {
    const { storyId } = ChapterParams.parse(req.params);
    const body = PostGenerateBody.parse(req.body);
    const { jobId } = await enqueueGenerateChapter({
      storyId,
      chapterNumber: body.chapterNumber,
      mode: body.mode,
    });
    return reply.code(202).send({ jobId, storyId, chapterNumber: body.chapterNumber });
  });

  app.get('/api/stories/:storyId/chapters/:chapterNumber/status', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    const status = await getGenerateChapterStatus(storyId, chapterNumber);
    if (!status) return reply.code(404).send({ error: 'no_active_job' });
    return reply.send(status);
  });

  app.get('/api/stories/:storyId/chapters/:chapterNumber/stream', async (req, reply) => {
    const { storyId, chapterNumber } = ChapterDetailParams.parse(req.params);
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { storyId, chapterNumber });

    const pollInterval = setInterval(async () => {
      const status = await getGenerateChapterStatus(storyId, chapterNumber);
      if (!status) {
        sendEvent('status', { state: 'unknown' });
      } else {
        sendEvent('status', status);
        if (status.state === 'completed' || status.state === 'failed') {
          clearInterval(pollInterval);
          reply.raw.end();
        }
      }
    }, 2000);

    req.raw.on('close', () => {
      clearInterval(pollInterval);
    });
  });

  done();
};

export default plugin;