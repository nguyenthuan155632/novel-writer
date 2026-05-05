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
  it('uses static defaults regardless of process env', () => {
    const prev = process.env.WRITER_MODEL;
    process.env.WRITER_MODEL = 'custom/model';
    try {
      resetModelRoutesForTests();
      expect(modelFor('writer')).toBe('google/gemini-2.5-pro');
      expect(modelFor('high_stakes_reviewer')).toBe('google/gemini-2.5-pro');
    } finally {
      if (prev === undefined) delete process.env.WRITER_MODEL;
      else process.env.WRITER_MODEL = prev;
    }
  });

  it('defaults routes to planned flash/pro split', () => {
    expect(modelFor('writer')).toBe('google/gemini-2.5-pro');
    expect(modelFor('high_stakes_reviewer')).toBe('google/gemini-2.5-pro');
    expect(modelFor('summary_compactor')).toBe('google/gemini-2.5-flash');
    expect(modelFor('canon_extractor')).toBe('google/gemini-2.5-flash');
    expect(modelFor('conflict_resolver')).toBe('google/gemini-2.5-flash');
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
