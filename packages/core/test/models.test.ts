import { afterEach, describe, expect, it } from 'vitest';
import {
  getModelStatus,
  MODEL_CONFIG,
  modelFor,
  pricingFor,
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

  it('exposes ClinePass model hints and reference pricing', () => {
    const status = getModelStatus();

    expect(status.hints).toEqual(expect.arrayContaining([
      'cline-pass/glm-5.2',
      'cline-pass/kimi-k2.7-code',
      'cline-pass/kimi-k2.6',
      'cline-pass/deepseek-v4-pro',
      'cline-pass/deepseek-v4-flash',
      'cline-pass/mimo-v2.5',
      'cline-pass/mimo-v2.5-pro',
      'cline-pass/minimax-m3',
      'cline-pass/qwen3.7-max',
      'cline-pass/qwen3.7-plus',
    ]));
    expect(pricingFor('cline-pass/glm-5.2')).toEqual({
      input: 1.4,
      cachedInput: 0.26,
      output: 4.4,
    });
    expect(pricingFor('cline-pass/qwen3.7-plus')).toEqual({
      input: 0.4,
      cachedInput: 0.04,
      output: 1.6,
    });
  });
});
