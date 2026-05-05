import type { EntryState } from "@novel/core";
import type { ChapterPacket } from "../schemas/packet.js";
import type { ProgressWindowSource } from "./progress.js";
import type { CanonConflictType } from "@novel/core";

export type StyleFewShot = { excerpt: string; sourceChapter?: number };

export type HotTier = {
  systemRules: string;
  bibleCompact: string;
  styleGuide: string;
  powerSystem: string;
  powerSystemKind: string;
  styleFewShots: StyleFewShot[];
  genreContract: string;
  personalityContract: string;
  storyOptionsBlock: string;
};

export type CharacterCompact = {
  id: string;
  name: string;
  currentRealm?: string;
  status: "alive" | "dead" | "missing" | "unknown";
  bloodlines: string[];
  faction?: string;
  shortTraits: string[];
};

export type ThreadCompact = {
  id: string;
  title: string;
  state: "open" | "partial" | "resolved";
  introducedChapter: number;
  plannedResolutionChapter?: number;
};

export type SeedCompact = {
  id: string;
  seedText: string;
  payoffDescription: string;
  plantWindowStart: number;
  plantWindowEnd: number;
  payoffChapter?: number;
  status: "pending" | "planted" | "paid_off" | "abandoned";
};

export type FactionCompact = {
  id: string;
  name: string;
  status: "active" | "destroyed" | "hidden" | "absorbed" | "unknown";
  type?: string;
  powerLevel?: string;
};

export type TimelineEventCompact = {
  chapterNumber: number;
  eventType: string;
  eventText: string;
  importance: string;
};

export type PendingCanonUpdateCompact = {
  id: string;
  updateType: string;
  targetTable: string;
  conflictStatus: string;
  conflictReasons: CanonConflictType[];
  summary: string;
};

export type WarmTier = {
  sagaSummary: string;
  arcSummary: string;
  activeCharacters: CharacterCompact[];
  arcOpenThreads: ThreadCompact[];
  arcPlantedSeeds: SeedCompact[];
  /**
   * All canonical factions for this story. Kept in WARM (not COLD) because the
   * unknown-faction validator and canon-extractor both need a stable list every
   * chapter, not a vector-retrieved subset.
   *
   * Optional for backward compatibility with older test fixtures and snapshots
   * predating faction-aware canon. Production builder always populates it;
   * consumers should treat `undefined` as `[]`.
   */
  knownFactions?: FactionCompact[];
  tailContentPrev?: string;
  entryState?: EntryState;
};

export type ChapterSummaryCompact = {
  chapterNumber: number;
  summary: string;
};

export type CanonFactCompact = {
  id: string;
  topic: string;
  importance: string;
  fact: string;
};

export type ColdTier = {
  recentSummaries: ChapterSummaryCompact[];
  retrievedFacts: CanonFactCompact[];
  retrievedPastChapters: ChapterSummaryCompact[];
  seedsToPlantNow: SeedCompact[];
  timelineEvents: TimelineEventCompact[];
  pendingCanonUpdates: PendingCanonUpdateCompact[];
  packet: ChapterPacket;
};

export type ChapterContext = {
  hot: HotTier;
  warm: WarmTier;
  cold: ColdTier;
  meta: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    hotHash: string;
    warmHash: string;
    sagaProgressPercent: number | null;
    arcProgressPercent: number | null;
    sagaProgressSource: ProgressWindowSource | null;
    arcProgressSource: ProgressWindowSource | null;
    sagaRange: string | null;
    arcRange: string | null;
    sagaPhase: "setup" | "development" | "climax_buildup" | "climax" | null;
    arcPhase: "setup" | "development" | "climax_buildup" | "climax" | null;
    activeTurningPoint: string | null;
    targetInputBudget: number;
  };
};
