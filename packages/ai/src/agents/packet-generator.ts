import { MODEL_CONFIG } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { ChapterPacketSchema, CHAPTER_PACKET_JSON_SCHEMA, type ChapterPacket } from '../schemas/packet.ts';
import { packetGeneratorPromptV1, type PacketGeneratorPromptInput } from '../prompts/packet-generator.v1.ts';

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  error(obj: Record<string, unknown>, msg: string): void;
}

export type PacketGeneratorDeps = {
  provider: LLMProvider;
  logger: Logger;
};

export type PacketGenerationResult = {
  packet: ChapterPacket;
  promptVersion: string;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
};

export class PacketGenerator {
  constructor(private readonly deps: PacketGeneratorDeps) {}

  async generate(input: PacketGeneratorPromptInput, ctx: { traceId: string; storyId: string; auditHints?: string[] }): Promise<PacketGenerationResult> {
    const log = this.deps.logger.child({ traceId: ctx.traceId, agent: 'packet_generator' });
    const built = packetGeneratorPromptV1.build(input as unknown as Record<string, unknown>);
    const userWithHints = ctx.auditHints && ctx.auditHints.length > 0
      ? `${built.user}\n\n# REGENERATION HINTS (sửa lỗi audit)\n${ctx.auditHints.map(h => `- ${h}`).join('\n')}`
      : built.user;

    const res = await this.deps.provider.complete({
      model: MODEL_CONFIG.routes.packet_generator,
      messages: [{ role: 'system', content: built.system }, { role: 'user', content: userWithHints }],
      responseSchema: CHAPTER_PACKET_JSON_SCHEMA,
      temperature: 0.4,
      metadata: {
        agentRole: packetGeneratorPromptV1.agentRole,
        promptVersion: packetGeneratorPromptV1.version,
        traceId: ctx.traceId,
        storyId: ctx.storyId,
      },
    });

    let parsed: ChapterPacket;
    try {
      parsed = ChapterPacketSchema.parse(JSON.parse(res.content));
    } catch (err) {
      log.error({ err, raw: res.content.slice(0, 500) }, 'packet parse failed');
      throw err;
    }

    return {
      packet: parsed,
      promptVersion: packetGeneratorPromptV1.version,
      rawContent: res.content,
      usage: res.usage,
      cost: 0,
    };
  }
}