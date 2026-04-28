import { createHash } from 'node:crypto';
import { EMBEDDING_DIM, type EmbeddingRequest, type EmbeddingResponse, type EmbeddingService } from './types.js';

export class MockEmbeddingService implements EmbeddingService {
  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const seedHash = createHash('sha256').update(req.input).digest();
    const vector = new Array<number>(EMBEDDING_DIM);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] = (seedHash[i % seedHash.length]! / 255) * 2 - 1;
    }
    return {
      vector,
      model: 'mock-embed',
      usage: { tokens: Math.ceil(req.input.length / 4) },
      cost: 0,
    };
  }
}