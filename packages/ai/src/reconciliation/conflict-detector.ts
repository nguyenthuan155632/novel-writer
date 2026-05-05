import type { ExtractorOutput } from "../schemas/extractor.ts";
import { realmIsRegression as checkRealmRegression } from "../utils/realm-order.ts";

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

export type CanonSnapshotFaction = {
  id: string;
  name: string;
  status: string;
  type?: string;
  /** Field names locked against further updates (e.g. ['status']). */
  lockedFields: string[];
};

export type CanonSnapshot = {
  characters: CanonSnapshotCharacter[];
  canonFacts: CanonSnapshotCanonFact[];
  threads: CanonSnapshotThread[];
  /**
   * Optional for backward compatibility with snapshots/tests predating
   * faction-aware canon. Treat `undefined` as `[]`.
   */
  factions?: CanonSnapshotFaction[];
  /**
   * Ordered realm ladder for realm regression detection.
   * Parsed from story_bibles.cultivation_system via `parseRealmLadder()`.
   * Falls back to DEFAULT_REALM_LADDER if not provided.
   */
  realmLadder?: readonly string[];
};

export type ConflictEntry = {
  type:
    | "locked_field"
    | "realm_regression"
    | "duplicate_fact"
    | "dead_character_action"
    | "thread_status_invalid";
  targetTable: string;
  targetId?: string;
  reason: string;
  payloadKey: string;
};

export function detectConflicts(
  extracted: ExtractorOutput,
  snapshot: CanonSnapshot,
): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  const ladder = snapshot.realmLadder ?? [];

  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const charByName = new Map(
    snapshot.characters.map((c) => [c.name.toLowerCase(), c]),
  );

  for (const cu of extracted.characterUpdates) {
    const existing = cu.targetId
      ? charById.get(cu.targetId)
      : charByName.get(cu.name.toLowerCase());

    if (existing && cu.action === "update") {
      const updatedFields = Object.keys(cu.fields);
      const lockedUpdates = updatedFields.filter((f) =>
        existing.lockedFields.includes(f),
      );
      for (const field of lockedUpdates) {
        conflicts.push({
          type: "locked_field",
          targetTable: "characters",
          targetId: existing.id,
          reason: `Field "${field}" is locked on character "${existing.name}"`,
          payloadKey: field,
        });
      }

      if (
        cu.fields.currentRealm &&
        existing.currentRealm &&
        !lockedUpdates.includes("currentRealm")
      ) {
        const newRealm = cu.fields.currentRealm;
        const isRegression = checkRealmRegression(
          existing.currentRealm,
          newRealm,
          ladder,
        );
        if (isRegression && !cu.intentionalRegression) {
          conflicts.push({
            type: "realm_regression",
            targetTable: "characters",
            targetId: existing.id,
            reason: `Realm regression on "${existing.name}" from "${existing.currentRealm}" to "${newRealm}" without intentionalRegression flag`,
            payloadKey: "currentRealm",
          });
        }
      }

      if (existing.status === "dead") {
        const nonStatusFields = updatedFields.filter((f) => f !== "status");
        if (cu.fields.status && cu.fields.status !== "dead") {
          conflicts.push({
            type: "dead_character_action",
            targetTable: "characters",
            targetId: existing.id,
            reason: `Character "${existing.name}" is dead but update changes status to "${cu.fields.status}"`,
            payloadKey: "status",
          });
        } else if (nonStatusFields.length > 0) {
          conflicts.push({
            type: "dead_character_action",
            targetTable: "characters",
            targetId: existing.id,
            reason: `Character "${existing.name}" is dead but fields [${nonStatusFields.join(", ")}] are being updated`,
            payloadKey: nonStatusFields[0]!,
          });
        }
      }
    }
  }

  const factByText = new Map(
    snapshot.canonFacts.map((f) => [f.fact.toLowerCase(), f]),
  );
  for (const cf of extracted.newCanonFacts) {
    const existing = factByText.get(cf.fact.toLowerCase());
    if (existing) {
      conflicts.push({
        type: "duplicate_fact",
        targetTable: "canon_facts",
        targetId: existing.id,
        reason: `Canon fact "${cf.fact}" already exists`,
        payloadKey: "fact",
      });
    }
  }

  for (const cf of extracted.newCanonFacts) {
    if (cf.importance === "locked") {
      const existingLocked = snapshot.canonFacts.filter((f) => f.locked);
      if (existingLocked.length >= 20) {
        conflicts.push({
          type: "duplicate_fact",
          targetTable: "canon_facts",
          reason: `Too many locked facts (max 20), cannot add "${cf.fact}" as locked`,
          payloadKey: "importance",
        });
      }
    }
  }

  const threadById = new Map(snapshot.threads.map((t) => [t.id, t]));
  for (const tu of extracted.threadUpdates) {
    if (tu.targetId) {
      const existing = threadById.get(tu.targetId);
      if (existing && tu.state === "open" && existing.status === "resolved") {
        conflicts.push({
          type: "thread_status_invalid",
          targetTable: "open_threads",
          targetId: existing.id,
          reason: `Thread "${existing.title}" is already resolved, cannot reopen to "${tu.state}"`,
          payloadKey: "status",
        });
      }
    }
  }

  const snapshotFactions = snapshot.factions ?? [];
  const factionById = new Map(snapshotFactions.map((f) => [f.id, f]));
  const factionByName = new Map(
    snapshotFactions.map((f) => [f.name.toLowerCase(), f]),
  );
  for (const fu of extracted.factionUpdates) {
    const existing = fu.targetId
      ? factionById.get(fu.targetId)
      : factionByName.get(fu.name.toLowerCase());

    if (fu.action === "create" && existing) {
      // Refuse to create a duplicate-named faction; updates should target the existing row instead.
      conflicts.push({
        type: "duplicate_fact",
        targetTable: "factions",
        targetId: existing.id,
        reason: `Faction "${existing.name}" already exists; create rejected (use update instead)`,
        payloadKey: "name",
      });
      continue;
    }

    if (fu.action === "update" && existing) {
      const updatedFields = Object.keys(fu.fields);

      const lockedUpdates = updatedFields.filter((f) =>
        existing.lockedFields.includes(f),
      );
      for (const field of lockedUpdates) {
        conflicts.push({
          type: "locked_field",
          targetTable: "factions",
          targetId: existing.id,
          reason: `Field "${field}" is locked on faction "${existing.name}"`,
          payloadKey: field,
        });
      }

      // A destroyed/absorbed faction can only be updated by status (e.g. revive → 'hidden')
      // or by adding clarifying notes. Membership/alliance shifts after destruction are nonsense.
      const isTerminal =
        existing.status === "destroyed" || existing.status === "absorbed";
      if (isTerminal) {
        const forbiddenFields = updatedFields.filter(
          (f) => f !== "status" && f !== "notes",
        );
        for (const f of forbiddenFields) {
          conflicts.push({
            type: "locked_field",
            targetTable: "factions",
            targetId: existing.id,
            reason: `Faction "${existing.name}" is ${existing.status}; field "${f}" cannot change`,
            payloadKey: f,
          });
        }
      }
    }
  }

  return conflicts;
}
