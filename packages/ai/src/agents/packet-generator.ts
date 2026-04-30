import { MODEL_CONFIG } from '@novel/core';
import { ZodError } from 'zod';
import type { CompletionUsage, LLMProvider } from '../providers/types.ts';
import { withCompletionRetryRaw } from '../parse-completion-json.ts';
import { ChapterPacketSchema, CHAPTER_PACKET_JSON_SCHEMA, PACKET_LIMITS, type ChapterPacket } from '../schemas/packet.ts';
import { packetGeneratorPromptV1, type PacketGeneratorPromptInput } from '../prompts/packet-generator.v1.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
}

export type PacketGeneratorDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

export type PacketGenerationResult = {
  packet: ChapterPacket;
  promptVersion: string;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
};

const PACKET_REPAIR_PROMPT_VERSION = `${packetGeneratorPromptV1.version}-repair-v1`;

function mergeUsage(a: CompletionUsage, b: CompletionUsage): CompletionUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
  };
}

function truncateAtBoundary(value: unknown, maxLen: number): unknown {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLen) return value;
  const clipped = value.slice(0, maxLen);
  const punctIdx = Math.max(
    clipped.lastIndexOf('.'),
    clipped.lastIndexOf('!'),
    clipped.lastIndexOf('?'),
    clipped.lastIndexOf('。'),
    clipped.lastIndexOf('！'),
    clipped.lastIndexOf('？'),
  );
  if (punctIdx >= Math.floor(maxLen * 0.6)) return clipped.slice(0, punctIdx + 1).trim();
  const wordBoundary = clipped.lastIndexOf(' ');
  if (wordBoundary >= Math.floor(maxLen * 0.6)) return clipped.slice(0, wordBoundary).trim();
  return clipped.trim();
}

function normalizePacketPayloadForFallback(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;

  const packet = { ...(payload as Record<string, unknown>) };
  packet.goal = truncateAtBoundary(packet.goal, PACKET_LIMITS.goal);
  packet.conflict = truncateAtBoundary(packet.conflict, PACKET_LIMITS.conflict);
  packet.cliffhanger = truncateAtBoundary(packet.cliffhanger, PACKET_LIMITS.cliffhanger);
  packet.setting = truncateAtBoundary(packet.setting, PACKET_LIMITS.setting);
  packet.notes = truncateAtBoundary(packet.notes, PACKET_LIMITS.notes);

  if (Array.isArray(packet.requiredEvents)) {
    packet.requiredEvents = packet.requiredEvents
      .slice(0, PACKET_LIMITS.requiredEvents)
      .map((event) => {
        if (!event || typeof event !== 'object') return event;
        const next = { ...(event as Record<string, unknown>) };
        next.description = truncateAtBoundary(next.description, PACKET_LIMITS.requiredEventDescription);
        return next;
      });
  }

  if (Array.isArray(packet.charactersPresent)) {
    packet.charactersPresent = packet.charactersPresent.slice(0, PACKET_LIMITS.charactersPresent);
  }

  if (Array.isArray(packet.forbiddenMoves)) {
    packet.forbiddenMoves = packet.forbiddenMoves.slice(0, PACKET_LIMITS.forbiddenMoves);
  }

  if (Array.isArray(packet.toneHints)) {
    packet.toneHints = packet.toneHints.slice(0, PACKET_LIMITS.toneHints);
  }

  return packet;
}

function parsePacketContent(content: string): ChapterPacket {
  const payload = JSON.parse(content);
  return ChapterPacketSchema.parse(payload);
}

function hasLengthOnlyIssues(err: unknown): err is ZodError {
  return err instanceof ZodError && err.issues.every(issue => issue.code === 'too_big');
}

export class PacketGenerator {
  constructor(private readonly deps: PacketGeneratorDeps) {}

  private async repairPacket(
    rawContent: string,
    ctx: { traceId: string; storyId: string },
  ): Promise<{ content: string; usage: CompletionUsage }> {
    const repaired = await withCompletionRetryRaw(
      'packet_generator_repair',
      async () => this.deps.provider.complete({
        model: this.deps.model ?? MODEL_CONFIG.routes.packet_generator,
        messages: [
          {
            role: 'system',
            content: 'Bạn là bộ sửa JSON ChapterPacket. Chỉ trả JSON hợp lệ, không giải thích.',
          },
          {
            role: 'user',
            content: [
              'Sửa JSON sau để đúng schema ChapterPacket và giữ nguyên ý chính.',
              'Giới hạn: goal<=500, conflict<=500, cliffhanger<=500, mỗi requiredEvents.description<=500.',
              'Nếu quá dài, rút gọn mạch lạc, không cắt cụt giữa ý.',
              'JSON gốc:',
              rawContent,
            ].join('\n\n'),
          },
        ],
        responseSchema: CHAPTER_PACKET_JSON_SCHEMA,
        temperature: 0.2,
        metadata: {
          agentRole: packetGeneratorPromptV1.agentRole,
          promptVersion: PACKET_REPAIR_PROMPT_VERSION,
          traceId: ctx.traceId,
          storyId: ctx.storyId,
        },
      }),
      3,
    );

    return { content: repaired.content, usage: repaired.usage };
  }

  async generate(input: PacketGeneratorPromptInput, ctx: { traceId: string; storyId: string; auditHints?: string[] }): Promise<PacketGenerationResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'packet_generator' });
    const built = packetGeneratorPromptV1.build(input as unknown as Record<string, unknown>);
    const userWithHints = ctx.auditHints && ctx.auditHints.length > 0
      ? `${built.user}\n\n# REGENERATION HINTS (sửa lỗi audit)\n${ctx.auditHints.map(h => `- ${h}`).join('\n')}`
      : built.user;

    const res = await withCompletionRetryRaw(
      'packet_generator',
      async () => this.deps.provider.complete({
        model: this.deps.model ?? MODEL_CONFIG.routes.packet_generator,
        messages: [{ role: 'system', content: built.system }, { role: 'user', content: userWithHints }],
        responseSchema: CHAPTER_PACKET_JSON_SCHEMA,
        temperature: 0.4,
        metadata: {
          agentRole: packetGeneratorPromptV1.agentRole,
          promptVersion: packetGeneratorPromptV1.version,
          traceId: ctx.traceId,
          storyId: ctx.storyId,
        },
      }),
      3,
    );

    let parsed: ChapterPacket;
    let totalUsage = res.usage;
    let rawContent = res.content;

    try {
      parsed = parsePacketContent(rawContent);
    } catch (err) {
      log.info({ err, raw: rawContent.slice(0, 500) }, 'packet parse failed, attempting repair');
      try {
        const repaired = await this.repairPacket(rawContent, { traceId: ctx.traceId, storyId: ctx.storyId });
        rawContent = repaired.content;
        totalUsage = mergeUsage(totalUsage, repaired.usage);
        parsed = parsePacketContent(rawContent);
      } catch (repairErr) {
        if (hasLengthOnlyIssues(repairErr)) {
          try {
            const repairedPayload = JSON.parse(rawContent);
            const fallbackPayload = normalizePacketPayloadForFallback(repairedPayload);
            parsed = ChapterPacketSchema.parse(fallbackPayload);
            log.info({ raw: rawContent.slice(0, 500) }, 'packet normalized with sentence-safe fallback');
          } catch (fallbackErr) {
            log.error({ err: fallbackErr, raw: rawContent.slice(0, 500) }, 'packet parse failed after repair');
            throw fallbackErr;
          }
        } else {
          log.error({ err: repairErr, raw: rawContent.slice(0, 500) }, 'packet parse failed after repair');
          throw repairErr;
        }
      }
    }

    return {
      packet: parsed,
      promptVersion: packetGeneratorPromptV1.version,
      rawContent,
      usage: totalUsage,
      cost: 0,
    };
  }
}
