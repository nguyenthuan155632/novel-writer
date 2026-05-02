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
    /**
     * Canonical faction names registered in `factions` for the story. Used by
     * the unknown-faction check and (defensively) by unknown-character /
     * unknown-location to suppress false positives.
     *
     * Optional for backward compatibility with test fixtures predating
     * faction-aware canon. Production worker always populates it; consumers
     * should treat `undefined` as `[]`.
     */
    knownFactionNames?: string[];
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