import { describe, expect, it } from 'vitest';
import { estimateTokens, estimateTokensJson } from '../../src/utils/tokens.js';

describe('estimateTokens', () => {
  it('returns 0 for empty', () => expect(estimateTokens('')).toBe(0));
  it('rounds up', () => expect(estimateTokens('1234')).toBe(2));
  it('handles unicode VN', () => expect(estimateTokens('Lam Trạch tu luyện đan dược')).toBeGreaterThan(5));
  it('json variant serialises', () => expect(estimateTokensJson({ a: 1 })).toBeGreaterThan(0));
});