import type { GenreFamily } from '@novel/core';
import type { CheckInput, CheckResult, DeterministicCheck, Severity } from './types.ts';
import { wordCountCheck } from './word-count.ts';
import { deadCharacterCheck } from './dead-character.ts';
import { realmJumpCheck } from './realm-jump.ts';
import { lockedFactCheck } from './locked-fact.ts';
import { makeForbiddenMoveCheck } from './forbidden-move.ts';
import { unknownCharacterCheck } from './unknown-character.ts';
import { unknownLocationCheck } from './unknown-location.ts';
import { unknownFactionCheck } from './unknown-faction.ts';
import { newBloodlineSourceCheck } from './new-bloodline-source.ts';
import { cliffhangerCheck } from './cliffhanger.ts';
import { conflictPresenceCheck } from './conflict-presence.ts';
import { styleRedFlagsCheck } from './style-red-flags.ts';
import { repetitionCheck } from './repetition.ts';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export function buildChecks(forbiddenRulesText: string, genreFamily: GenreFamily): DeterministicCheck[] {
  const isCultivation = genreFamily === 'cultivation';

  const allChecks: DeterministicCheck[] = [
    deadCharacterCheck,
    ...(isCultivation ? [realmJumpCheck, newBloodlineSourceCheck] : []),
    lockedFactCheck,
    makeForbiddenMoveCheck(forbiddenRulesText),
    wordCountCheck,
    unknownCharacterCheck,
    unknownLocationCheck,
    unknownFactionCheck,
    cliffhangerCheck,
    conflictPresenceCheck,
    styleRedFlagsCheck,
    repetitionCheck,
  ];

  return allChecks.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}

export type DeterministicValidatorResult = {
  pass: boolean;
  checks: {
    id: string;
    severity: Severity;
    pass: boolean;
    issues: string[];
  }[];
  shortCircuited: boolean;
};

export function runDeterministicValidator(input: CheckInput, checks: DeterministicCheck[]): DeterministicValidatorResult {
  const results: DeterministicValidatorResult['checks'] = [];
  let overallPass = true;
  let shortCircuited = false;

  for (const check of checks) {
    const result: CheckResult = check.run(input);
    results.push({
      id: check.id,
      severity: check.severity,
      pass: result.pass,
      issues: result.issues,
    });

    if (!result.pass) {
      overallPass = false;
      if (check.severity === 'critical') {
        shortCircuited = true;
        break;
      }
    }
  }

  return { pass: overallPass, checks: results, shortCircuited };
}