import type { Logger } from 'pino';
import { EMBEDDING_DIM, type EmbeddingRequest, type EmbeddingResponse, type EmbeddingService } from './types.js';

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
const PRICE_PER_MILLION_TOKENS = 0.02;

export class OpenRouterEmbeddingService implements EmbeddingService {
  constructor(
    private readonly opts: {
      apiKey: string;
      baseUrl?: string;
      logger: Logger;
    }
  ) {}

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = req.model ?? DEFAULT_MODEL;
    const url = `${this.opts.baseUrl ?? 'https://openrouter.ai/api/v1'}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: req.input }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Embedding API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      data: { embedding: number[] }[];
      usage: { prompt_tokens: number; total_tokens: number };
      model: string;
    };
    const vector = data.data[0]?.embedding;
    if (!vector || vector.length !== EMBEDDING_DIM) {
      throw new Error(`Embedding dim mismatch: expected ${EMBEDDING_DIM}, got ${vector?.length}`);
    }
    const tokens = data.usage.total_tokens ?? data.usage.prompt_tokens ?? 0;
    return {
      vector,
      model: data.model ?? model,
      usage: { tokens },
      cost: (tokens / 1_000_000) * PRICE_PER_MILLION_TOKENS,
    };
  }
}