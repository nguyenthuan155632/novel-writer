import { describe, it, expect } from 'vitest';
import { shouldPauseOnAuditFailure } from '../../src/jobs/generate-chapter.js';

describe('shouldPauseOnAuditFailure', () => {
  it('pauses in semi_auto and full_auto when the audit still requires regeneration', () => {
    expect(shouldPauseOnAuditFailure('semi_auto', true)).toBe(true);
    expect(shouldPauseOnAuditFailure('full_auto', true)).toBe(true);
  });
  it('does not pause in safe mode (human already reviews every chapter)', () => {
    expect(shouldPauseOnAuditFailure('safe', true)).toBe(false);
  });
  it('does not pause when the audit passed', () => {
    expect(shouldPauseOnAuditFailure('full_auto', false)).toBe(false);
  });
});
