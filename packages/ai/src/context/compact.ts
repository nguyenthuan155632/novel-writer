import type {
  CharacterCompact,
  ThreadCompact,
  SeedCompact,
  ChapterSummaryCompact,
  CanonFactCompact,
  FactionCompact,
  PendingCanonUpdateCompact,
} from "./types.js";
import type { PendingCanonUpdate } from "@novel/db/schema";

const FACTION_STATUSES = [
  "active",
  "destroyed",
  "hidden",
  "absorbed",
  "unknown",
] as const;

export function compactCharacter(
  c: {
    id: string;
    name: string;
    currentRealm?: string | null;
    status: string;
    currentBloodlines?: string[] | null;
    faction?: string | null;
    shortTraits?: string[] | null;
  },
  opts: { stripOptional?: boolean } = {},
): CharacterCompact {
  const traits = c.shortTraits ?? [];
  return {
    id: c.id,
    name: c.name,
    currentRealm: opts.stripOptional
      ? undefined
      : (c.currentRealm ?? undefined),
    status: (["alive", "dead", "missing", "unknown"].includes(c.status)
      ? c.status
      : "unknown") as CharacterCompact["status"],
    bloodlines: c.currentBloodlines ?? [],
    faction: opts.stripOptional ? undefined : (c.faction ?? undefined),
    shortTraits: traits.slice(0, 5),
  };
}

export function compactThread(t: {
  id: string;
  title: string;
  status: string;
  openedChapter: number | null;
  plannedResolutionChapter: number | null;
}): ThreadCompact {
  return {
    id: t.id,
    title: t.title,
    state: (["open", "partial", "resolved"].includes(t.status)
      ? t.status
      : "open") as ThreadCompact["state"],
    introducedChapter: t.openedChapter ?? 0,
    plannedResolutionChapter: t.plannedResolutionChapter ?? undefined,
  };
}

export function compactSeed(s: {
  id: string;
  seedText: string;
  payoffDescription: string;
  plantWindowStart: number;
  plantWindowEnd: number;
  payoffChapter: number | null;
  status: string;
}): SeedCompact {
  return {
    id: s.id,
    seedText: s.seedText,
    payoffDescription: s.payoffDescription,
    plantWindowStart: s.plantWindowStart,
    plantWindowEnd: s.plantWindowEnd,
    payoffChapter: s.payoffChapter ?? undefined,
    status: (["pending", "planted", "paid_off", "abandoned"].includes(s.status)
      ? s.status
      : "pending") as SeedCompact["status"],
  };
}

export function compactSummary(s: {
  chapterNumber: number;
  summary: string;
}): ChapterSummaryCompact {
  return { chapterNumber: s.chapterNumber, summary: s.summary };
}

export function compactFact(f: {
  id: string;
  topic: string;
  importance: string;
  fact: string;
}): CanonFactCompact {
  return { id: f.id, topic: f.topic, importance: f.importance, fact: f.fact };
}

export function compactFaction(f: {
  id: string;
  name: string;
  status: string;
  type?: string | null;
  powerLevel?: string | null;
}): FactionCompact {
  const status = (FACTION_STATUSES as readonly string[]).includes(f.status)
    ? (f.status as FactionCompact["status"])
    : "unknown";
  return {
    id: f.id,
    name: f.name,
    status,
    type: f.type ?? undefined,
    powerLevel: f.powerLevel ?? undefined,
  };
}

export function compactPendingCanonUpdate(
  row: PendingCanonUpdate,
): PendingCanonUpdateCompact {
  const payload = row.payload as Record<string, unknown> | null;
  const name =
    typeof payload?.name === "string" ? (payload.name as string) : null;
  const fact =
    typeof payload?.fact === "string"
      ? (payload.fact as string).slice(0, 120)
      : null;
  const summary = name ?? fact ?? `${row.updateType} on ${row.targetTable}`;
  return {
    id: row.id,
    updateType: row.updateType,
    targetTable: row.targetTable,
    conflictStatus: row.conflictStatus,
    conflictReasons: row.conflictReasons ?? [],
    summary,
  };
}
