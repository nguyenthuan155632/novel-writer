import { afterEach, describe, expect, it } from 'vitest';
import {
  getModelStatus,
  MODEL_CONFIG,
  modelFor,
  resetModelRoutesForTests,
  setModelRoutes,
} from '../src/config/models.ts';

afterEach(() => {
  resetModelRoutesForTests();
});

describe('MODEL_CONFIG', () => {
  it('defaults agent routes to google/gemini-2.5-flash', () => {
    expect(Object.values(MODEL_CONFIG.routes).every((model) => model === 'google/gemini-2.5-flash')).toBe(true);
    expect(modelFor('writer')).toBe('google/gemini-2.5-flash');
  });

  it('updates model routes at runtime', () => {
    const status = setModelRoutes({
      writer: 'google/gemini-2.5-flash',
      llm_validator: 'google/gemini-2.5-flash-lite',
    });

    expect(status.routes.writer).toBe('google/gemini-2.5-flash');
    expect(modelFor('writer')).toBe('google/gemini-2.5-flash');
    expect(modelFor('llm_validator')).toBe('google/gemini-2.5-flash-lite');
    expect(modelFor('bible_generator')).toBe('google/gemini-2.5-flash');
  });

  it('exposes model input metadata and hint ids', () => {
    const status = getModelStatus();

    expect(status.options.map((option) => option.role)).toContain('writer');
    expect(status.hints).toContain('google/gemini-2.5-flash');
    expect(status.hints).toContain('google/gemini-2.5-pro');
  });
});
