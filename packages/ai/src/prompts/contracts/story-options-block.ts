import {
  TONES,
  PACINGS,
  MAIN_CONFLICT_TYPES,
  POWER_SYSTEM_STYLES,
  WORLD_ERAS,
  ROMANCE_LEVELS,
  COMEDY_LEVELS,
  DARK_LEVELS,
  POVS,
  MORALITIES,
  type StoryOptions,
} from "@novel/core";
import {
  type PromptTarget,
  type OptionGuidance,
  getAllGuidanceForTarget,
} from "./story-options-guidance.ts";

export type { PromptTarget } from "./story-options-guidance.ts";

export interface BuildStoryOptionsBlockParams {
  storyOptions: StoryOptions;
  target: PromptTarget;
  /** 'full' renders all guidance; 'compact' renders only labels + key rules (for context-constrained calls) */
  intensity?: "full" | "compact";
}

/**
 * Build a rich semantic Story Options block tailored to a specific prompt target.
 *
 * Replaces the old label-only rendering with actionable behavioral rules
 * that vary by target (bible, saga, arc, packet, writer, validator).
 */
export function buildStoryOptionsBlock(
  params: BuildStoryOptionsBlockParams,
): string {
  const { storyOptions, target, intensity = "full" } = params;
  const entries = getAllGuidanceForTarget(
    storyOptions as Record<string, string | undefined>,
    target,
  );

  if (entries.length === 0) {
    // Fallback: render header + labels only if no target-specific guidance exists
    return `# STORY OPTIONS\n${renderLabelSummary(storyOptions)}`;
  }

  const sections: string[] = ["# STORY OPTIONS CONTRACT (BẮT BUỘC)"];
  sections.push(renderLabelSummary(storyOptions));
  sections.push("");

  for (const { optionKey, guidance } of entries) {
    sections.push(renderGuidanceSection(optionKey, guidance, intensity));
  }

  // Cross-option interaction notes
  const interactions = buildInteractionNotes(storyOptions, target);
  if (interactions) {
    sections.push("");
    sections.push(interactions);
  }

  return sections.join("\n");
}

/**
 * Legacy backward-compatible function.
 * Uses 'writer' target by default for existing call sites that haven't been updated.
 */
export function renderStoryOptionsBlock(o: StoryOptions): string {
  return buildStoryOptionsBlock({ storyOptions: o, target: "writer" });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function renderLabelSummary(o: StoryOptions): string {
  const label = <T extends { slug: string; viLabel: string }>(
    list: readonly T[],
    slug: string | undefined,
  ): string =>
    slug ? (list.find((x) => x.slug === slug)?.viLabel ?? slug) : "—";

  const parts: string[] = [];
  if (o.tone) parts.push(`Tone: ${label(TONES, o.tone)}`);
  if (o.pacing) parts.push(`Pacing: ${label(PACINGS, o.pacing)}`);
  if (o.mainConflictType)
    parts.push(
      `Main conflict: ${label(MAIN_CONFLICT_TYPES, o.mainConflictType)}`,
    );
  if (o.powerSystemStyle)
    parts.push(
      `Power system: ${label(POWER_SYSTEM_STYLES, o.powerSystemStyle)}`,
    );
  if (o.worldEra) parts.push(`World era: ${label(WORLD_ERAS, o.worldEra)}`);
  if (o.pov) parts.push(`POV: ${label(POVS, o.pov)}`);
  if (o.romanceLevel)
    parts.push(`Romance: ${label(ROMANCE_LEVELS, o.romanceLevel)}`);
  if (o.comedyLevel)
    parts.push(`Comedy: ${label(COMEDY_LEVELS, o.comedyLevel)}`);
  if (o.darkLevel) parts.push(`Dark: ${label(DARK_LEVELS, o.darkLevel)}`);
  if (o.protagonistMorality)
    parts.push(`Morality: ${label(MORALITIES, o.protagonistMorality)}`);

  return parts.length > 0 ? parts.join(" | ") : "(không có story options)";
}

const OPTION_TITLES: Record<string, string> = {
  tone: "TONE",
  pacing: "PACING",
  mainConflictType: "MAIN CONFLICT",
  powerSystemStyle: "POWER SYSTEM",
  worldEra: "WORLD ERA",
  romanceLevel: "ROMANCE",
  comedyLevel: "COMEDY",
  darkLevel: "DARK LEVEL",
  pov: "POV",
  protagonistMorality: "PROTAGONIST MORALITY",
};

function renderGuidanceSection(
  optionKey: string,
  g: OptionGuidance,
  intensity: "full" | "compact",
): string {
  const title = OPTION_TITLES[optionKey] ?? optionKey.toUpperCase();
  const lines: string[] = [`## ${title}: ${g.label}`];
  lines.push(`Intent: ${g.semanticIntent}`);

  if (intensity === "full") {
    if (g.rules.length > 0) {
      lines.push("Rules:");
      for (const r of g.rules) lines.push(`- ${r}`);
    }
    if (g.mustInclude && g.mustInclude.length > 0) {
      lines.push("Must include:");
      for (const m of g.mustInclude) lines.push(`- ${m}`);
    }
    if (g.avoid && g.avoid.length > 0) {
      lines.push("Avoid:");
      for (const a of g.avoid) lines.push(`- ${a}`);
    }
  } else {
    // compact: only first 2 rules + avoid
    const shortRules = g.rules.slice(0, 2);
    if (shortRules.length > 0) {
      for (const r of shortRules) lines.push(`- ${r}`);
    }
    if (g.avoid && g.avoid.length > 0) {
      lines.push(`Avoid: ${g.avoid.slice(0, 2).join("; ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate cross-option interaction notes for common combinations.
 * Only produces output for combinations that need explicit coordination.
 */
function buildInteractionNotes(
  o: StoryOptions,
  _target: PromptTarget,
): string | null {
  const notes: string[] = [];

  // Dark + Comedy interaction
  if (
    o.darkLevel &&
    o.comedyLevel &&
    o.darkLevel !== "bright" &&
    o.comedyLevel !== "none"
  ) {
    if (o.darkLevel === "dark" || o.darkLevel === "extreme_dark") {
      notes.push(
        "Dark + Comedy: Gallows humor, sardonic wit — contrast enhances cả hai. Comedy KHÔNG triệt tiêu dark tone. Dark KHÔNG loại bỏ comic moments. Chúng coexist qua irony và contrast.",
      );
    } else {
      notes.push(
        "Dark + Comedy: Comedy cần respect tonal weight. Humor OK trong breathing moments, nhưng không undermine serious scenes.",
      );
    }
  }

  // Fast pacing + Heavy romance — potential tension
  if (o.pacing === "fast" && o.romanceLevel === "heavy") {
    notes.push(
      "Fast pacing + Heavy romance: Romance beats phải tight và impactful — no languid romantic scenes. Show chemistry through action, decisions, brief intense moments.",
    );
  }

  // Modern era + Cultivation power system
  if (o.worldEra === "modern" && o.powerSystemStyle === "realm") {
    notes.push(
      "Modern era + Cultivation: Cultivation exists WITHIN modern world — hidden societies, secret sects, parallel dimension access. KHÔNG default sang full ancient setting. Modern infrastructure vẫn tồn tại.",
    );
  }

  // Ancient era + Tech power system
  if (o.worldEra === "ancient" && o.powerSystemStyle === "tech") {
    notes.push(
      "Ancient era + Tech: Technology phải phù hợp era — alchemy, ancient mechanisms, lost civilization artifacts. KHÔNG modern electronics/computers.",
    );
  }

  if (notes.length === 0) return null;
  return `## CROSS-OPTION INTERACTIONS\n${notes.map((n) => `- ${n}`).join("\n")}`;
}
