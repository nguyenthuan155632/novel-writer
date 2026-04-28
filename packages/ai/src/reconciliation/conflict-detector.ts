import type { ExtractorOutput } from '../schemas/extractor.ts';

export type CanonSnapshotCharacter = {
  id: string;
  name: string;
  currentRealm?: string;
  status: string;
  currentBloodlines: string[];
  faction?: string;
  lockedFields: string[];
};

export type CanonSnapshotCanonFact = {
  id: string;
  fact: string;
  importance: string;
  locked: boolean;
};

export type CanonSnapshotThread = {
  id: string;
  title: string;
  status: string;
};

export type CanonSnapshot = {
  characters: CanonSnapshotCharacter[];
  canonFacts: CanonSnapshotCanonFact[];
  threads: CanonSnapshotThread[];
};

export type ConflictEntry = {
  type: 'locked_field' | 'realm_regression' | 'locked_fact' | 'duplicate_fact' | 'dead_character_action' | 'thread_status_invalid';
  targetTable: string;
  targetId?: string;
  reason: string;
  payloadKey: string;
};

export function detectConflicts(extracted: ExtractorOutput, snapshot: CanonSnapshot): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];

  const charById = new Map(snapshot.characters.map(c => [c.id, c]));
  const charByName = new Map(snapshot.characters.map(c => [c.name.toLowerCase(), c]));

  for (const cu of extracted.characterUpdates) {
    const existing = cu.targetId
      ? charById.get(cu.targetId)
      : charByName.get(cu.name.toLowerCase());

    if (existing && cu.action === 'update') {
      const updatedFields = Object.keys(cu.fields);
      const lockedUpdates = updatedFields.filter(f => existing.lockedFields.includes(f));
      for (const field of lockedUpdates) {
        conflicts.push({
          type: 'locked_field',
          targetTable: 'characters',
          targetId: existing.id,
          reason: `Field "${field}" is locked on character "${existing.name}"`,
          payloadKey: field,
        });
      }

      if (cu.fields.currentRealm && existing.currentRealm && !lockedUpdates.includes('currentRealm')) {
        const newRealm = cu.fields.currentRealm;
        const isRegression = realmIsRegression(existing.currentRealm, newRealm);
        if (isRegression && !cu.intentionalRegression) {
          conflicts.push({
            type: 'realm_regression',
            targetTable: 'characters',
            targetId: existing.id,
            reason: `Realm regression on "${existing.name}" from "${existing.currentRealm}" to "${newRealm}" without intentionalRegression flag`,
            payloadKey: 'currentRealm',
          });
        }
      }

      if (existing.status === 'dead') {
        const nonStatusFields = updatedFields.filter(f => f !== 'status');
        if (cu.fields.status && cu.fields.status !== 'dead') {
          conflicts.push({
            type: 'dead_character_action',
            targetTable: 'characters',
            targetId: existing.id,
            reason: `Character "${existing.name}" is dead but update changes status to "${cu.fields.status}"`,
            payloadKey: 'status',
          });
        } else if (nonStatusFields.length > 0) {
          conflicts.push({
            type: 'dead_character_action',
            targetTable: 'characters',
            targetId: existing.id,
            reason: `Character "${existing.name}" is dead but fields [${nonStatusFields.join(', ')}] are being updated`,
            payloadKey: nonStatusFields[0]!,
          });
        }
      }
    }
  }

  const factByText = new Map(snapshot.canonFacts.map(f => [f.fact.toLowerCase(), f]));
  for (const cf of extracted.newCanonFacts) {
    const existing = factByText.get(cf.fact.toLowerCase());
    if (existing) {
      conflicts.push({
        type: 'duplicate_fact',
        targetTable: 'canon_facts',
        targetId: existing.id,
        reason: `Canon fact "${cf.fact}" already exists`,
        payloadKey: 'fact',
      });
    }
  }

  for (const cf of extracted.newCanonFacts) {
    if (cf.importance === 'locked') {
      const existingLocked = snapshot.canonFacts.filter(f => f.locked);
      if (existingLocked.length >= 20) {
        conflicts.push({
          type: 'locked_fact',
          targetTable: 'canon_facts',
          reason: `Too many locked facts (max 20), cannot add "${cf.fact}" as locked`,
          payloadKey: 'importance',
        });
      }
    }
  }

  const threadById = new Map(snapshot.threads.map(t => [t.id, t]));
  for (const tu of extracted.threadUpdates) {
    if (tu.targetId) {
      const existing = threadById.get(tu.targetId);
      if (existing && tu.state === 'open' && existing.status === 'resolved') {
        conflicts.push({
          type: 'thread_status_invalid',
          targetTable: 'open_threads',
          targetId: existing.id,
          reason: `Thread "${existing.title}" is already resolved, cannot reopen to "${tu.state}"`,
          payloadKey: 'status',
        });
      }
    }
  }

  return conflicts;
}

const REALM_ORDER = [
  'phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
  'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp',
];

function realmRank(r: string): number {
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

function realmIsRegression(current: string, proposed: string): boolean {
  const currentRank = realmRank(current);
  const proposedRank = realmRank(proposed);
  if (currentRank < 0 || proposedRank < 0) return false;
  return proposedRank < currentRank;
}
