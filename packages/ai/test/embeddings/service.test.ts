import { describe, expect, it } from 'vitest';
import { MockEmbeddingService } from '../../src/embeddings/mock.js';
import { EMBEDDING_DIM } from '../../src/embeddings/types.js';

describe('MockEmbeddingService', () => {
  it('returns deterministic vector of correct dim', async () => {
    const svc = new MockEmbeddingService();
    const a = await svc.embed({ input: 'hello', traceId: 't1' });
    const b = await svc.embed({ input: 'hello', traceId: 't2' });
    expect(a.vector).toHaveLength(EMBEDDING_DIM);
    expect(a.vector).toEqual(b.vector);
  });

  it('different inputs → different vectors', async () => {
    const svc = new MockEmbeddingService();
    const a = await svc.embed({ input: 'foo', traceId: 't' });
    const b = await svc.embed({ input: 'bar', traceId: 't' });
    expect(a.vector).not.toEqual(b.vector);
  });
});