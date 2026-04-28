import type { ChapterContext } from '../../context/types.ts';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type CheckInput = {
  content: string;
  context: ChapterContext;
  chapter: { id?: string; chapterNumber: number };
  story: { id: string };
  canon: {
    deadCharacterNames: string[];
    knownCharacterNames: string[];
    knownLocationNames: string[];
    knownBloodlineNames: string[];
    lockedFacts: { topic: string; fact: string }[];
    realmByCharacter: Record<string, string | undefined>;
  };
};

export type CheckResult = {
  pass: boolean;
  issues: string[];
};

export type DeterministicCheck = {
  id: string;
  severity: Severity;
  run(input: CheckInput): CheckResult;
};