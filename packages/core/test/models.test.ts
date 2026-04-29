import { describe, it, expect } from 'vitest';
import { MODEL_CONFIG, modelFor } from '../src/config/models.ts';

describe('MODEL_CONFIG', () => {
  it('defaults agent routes to kimi-k2.6', () => {
    expect(Object.values(MODEL_CONFIG.routes).every((model) => model === 'kimi-k2.6')).toBe(true);
    expect(modelFor('writer')).toBe('kimi-k2.6');
  });
});
