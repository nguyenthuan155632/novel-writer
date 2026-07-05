import { describe, it, expect } from 'vitest';
import {
  shouldPauseOnAuditFailure,
  shouldPauseOnHighValidatorIssue,
  validationStatusForDeterministicResult,
} from '../../src/jobs/generate-chapter.js';

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

describe('shouldPauseOnHighValidatorIssue', () => {
  it('pauses safe and semi_auto chapters so failed content can be reviewed instead of retried blind', () => {
    expect(shouldPauseOnHighValidatorIssue('safe', true)).toBe(true);
    expect(shouldPauseOnHighValidatorIssue('semi_auto', true)).toBe(true);
  });

  it('lets full_auto continue when configured for unattended throughput', () => {
    expect(shouldPauseOnHighValidatorIssue('full_auto', true)).toBe(false);
  });

  it('does not pause when no high validator issue exists', () => {
    expect(shouldPauseOnHighValidatorIssue('semi_auto', false)).toBe(false);
  });
});

describe('validationStatusForDeterministicResult', () => {
  it('treats low and medium deterministic issues as non-blocking warnings', () => {
    expect(validationStatusForDeterministicResult([
      { pass: false, severity: 'low' },
      { pass: false, severity: 'medium' },
    ])).toBe('passed');
  });

  it('fails on high or critical deterministic issues', () => {
    expect(validationStatusForDeterministicResult([
      { pass: false, severity: 'high' },
    ])).toBe('failed');
    expect(validationStatusForDeterministicResult([
      { pass: false, severity: 'critical' },
    ])).toBe('failed');
  });
});
