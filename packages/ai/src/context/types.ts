import type { ChapterPacket } from '../schemas/packet.js';

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
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  bloodlines: string[];
  faction?: string;
  shortTraits: string[];
};

export type ThreadCompact = {
  id: string;
  title: string;
  state: 'open' | 'partial' | 'resolved';
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
  status: 'pending' | 'planted' | 'paid_off' | 'abandoned';
};

export type WarmTier = {
  sagaSummary: string;
  arcSummary: string;
  activeCharacters: CharacterCompact[];
  arcOpenThreads: ThreadCompact[];
  arcPlantedSeeds: SeedCompact[];
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
    targetInputBudget: number;
  };
};