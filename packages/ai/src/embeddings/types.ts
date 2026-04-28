export const EMBEDDING_DIM = 1536;

export type EmbeddingRequest = {
  input: string;
  model?: string;
  traceId: string;
};

export type EmbeddingResponse = {
  vector: number[];
  model: string;
  usage: { tokens: number };
  cost: number;
};

export interface EmbeddingService {
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}