import { describe, expect, it } from 'vitest';

import { fillAllModelRoutes } from '../app/admin/model-settings-state';
import type { ModelOption } from '../lib/api/models';

describe('fillAllModelRoutes', () => {
  it('assigns the clicked model id to every agent option', () => {
    const options = [
      { role: 'writer', label: 'Writer', envVar: 'WRITER_MODEL', description: 'Drafts chapters' },
      {
        role: 'llm_validator',
        label: 'LLM Validator',
        envVar: 'LLM_VALIDATOR_MODEL',
        description: 'Reviews chapters',
      },
      {
        role: 'summary_compactor',
        label: 'Summary Compactor',
        envVar: 'SUMMARY_COMPACTOR_MODEL',
        description: 'Compacts context',
      },
    ] satisfies ModelOption[];

    expect(fillAllModelRoutes(options, 'google/gemini-2.5-flash')).toEqual({
      writer: 'google/gemini-2.5-flash',
      llm_validator: 'google/gemini-2.5-flash',
      summary_compactor: 'google/gemini-2.5-flash',
    });
  });
});
