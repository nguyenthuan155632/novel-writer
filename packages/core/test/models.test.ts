import { describe, it, expect } from 'vitest';
import { MODEL_CONFIG, modelFor } from '../src/config/models.ts';

describe('MODEL_CONFIG', () => {
  it('defaults agent routes to glm-5.1', () => {
    expect(Object.values(MODEL_CONFIG.routes).every((model) => model === 'glm-5.1')).toBe(true);
    expect(modelFor('writer')).toBe('glm-5.1');
  });
});
