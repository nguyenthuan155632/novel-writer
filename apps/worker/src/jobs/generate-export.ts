import { getDb } from '@novel/db';
import { stories, chapters } from '@novel/db/schema';
import { eq, and, isNotNull, asc } from 'drizzle-orm';
import { renderMarkdown, renderEpub, EXPORT_CONFIG, type ExportFormat } from '@novel/core';
import { createLogger } from '@novel/core/logger';
import { Queue, type ConnectionOptions } from 'bullmq';
import { createConnection } from '../queues.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const log = createLogger('generate-export');

export interface GenerateExportJobData {
  storyId: string;
  format: ExportFormat;
}

export interface GenerateExportJobResult {
  filepath: string;
  bytes: number;
}

export const GENERATE_EXPORT_QUEUE_NAME = 'generate-export';

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'story';
}

export async function runGenerateExportJob(
  data: GenerateExportJobData,
  ctx: { logger: typeof log },
): Promise<GenerateExportJobResult> {
  const { storyId, format } = data;
  const jobLog = ctx.logger;

  jobLog.info({ storyId, format }, 'generate-export job started');

  const db = getDb();

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);

  if (!story) {
    throw new Error(`Story not found: ${storyId}`);
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

  const exportInput = {
    story: {
      title: story.title,
      author: null,
      synopsis: story.premise,
    },
    chapters: exportChapters,
  };

  const outputDir = process.env.EXPORT_OUTPUT_DIR ?? './exports';
  await mkdir(outputDir, { recursive: true });

  const storySlug = slug(story.title);
  const timestamp = Date.now();

  let filepath: string;
  let bytes: number;

  if (format === 'markdown') {
    const content = renderMarkdown(exportInput);
    const filename = `${storySlug}-${timestamp}.md`;
    filepath = join(outputDir, filename);
    await writeFile(filepath, content, 'utf-8');
    bytes = Buffer.byteLength(content, 'utf-8');
  } else {
    const buf = await renderEpub(exportInput);
    const filename = `${storySlug}-${timestamp}.epub`;
    filepath = join(outputDir, filename);
    await writeFile(filepath, buf);
    bytes = buf.length;
  }

  jobLog.info({ storyId, format, filepath, bytes }, 'generate-export job completed');

  return { filepath, bytes };
}

let _exportQueue: Queue<GenerateExportJobData> | null = null;

export function getGenerateExportQueue(): Queue<GenerateExportJobData> {
  if (!_exportQueue) {
    const connection = createConnection();
    _exportQueue = new Queue<GenerateExportJobData>(GENERATE_EXPORT_QUEUE_NAME, {
      connection: connection as ConnectionOptions,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return _exportQueue;
}

export async function enqueueGenerateExport(data: GenerateExportJobData): Promise<string> {
  const queue = getGenerateExportQueue();
  const job = await queue.add('generate-export', data);
  return job.id!;
}
