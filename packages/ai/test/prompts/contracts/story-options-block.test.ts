import { describe, it, expect } from "vitest";
import {
  buildStoryOptionsBlock,
  renderStoryOptionsBlock,
} from "../../../src/prompts/contracts/story-options-block.ts";
import type { StoryOptions } from "@novel/core";

describe("buildStoryOptionsBlock", () => {
  describe("backward compatibility", () => {
    it("renderStoryOptionsBlock still works and defaults to writer target", () => {
      const out = renderStoryOptionsBlock({ tone: "serious", pov: "first" });
      expect(out).toContain("STORY OPTIONS CONTRACT");
      expect(out).toContain("Tone: Nghiêm túc");
      expect(out).toContain("POV: Ngôi nhất");
    });

    it("handles fully empty input without crashing", () => {
      const out = renderStoryOptionsBlock({});
      expect(out).toContain("STORY OPTIONS");
      expect(out).toContain("không có story options");
    });
  });

  describe("target-specific rendering", () => {
    it("bible target renders bible-specific guidance for power system", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { powerSystemStyle: "realm" },
        target: "bible",
      });
      expect(out).toContain("STORY OPTIONS CONTRACT");
      expect(out).toContain("POWER SYSTEM");
      expect(out).toContain("Cảnh giới");
      expect(out).toContain("cảnh giới");
      // Bible-specific: mentions defining realms
      expect(out).toContain("PHẢI định nghĩa");
      // Should NOT contain writer-specific combat guidance
      expect(out).not.toContain("meditation, absorb resources");
    });

    it("writer target renders prose/writing rules", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "fast" },
        target: "writer",
      });
      expect(out).toContain("PACING");
      expect(out).toContain("Nhanh");
      expect(out).toContain("Prose");
      // Writer-specific
      expect(out).toContain("câu ngắn");
    });

    it("validator target renders check criteria", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pov: "third_limited" },
        target: "validator",
      });
      expect(out).toContain("POV");
      expect(out).toContain("Ngôi ba giới hạn");
      expect(out).toContain("Flag");
      // Should contain head-hopping check
      expect(out).toContain("thoughts of non-POV character");
    });

    it("saga target renders saga-specific pacing guidance", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "slow", mainConflictType: "revenge" },
        target: "saga",
      });
      expect(out).toContain("PACING");
      expect(out).toContain("Chậm chắc");
      expect(out).toContain("setup dài hơn");
      expect(out).toContain("MAIN CONFLICT");
      expect(out).toContain("Báo thù");
      expect(out).toContain("stages of revenge");
    });

    it("arc target renders arc-specific guidance", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "fast", mainConflictType: "power_struggle" },
        target: "arc",
      });
      expect(out).toContain("Arc compact");
      expect(out).toContain("Tranh quyền");
    });

    it("packet target renders chapter planning rules", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "slow", romanceLevel: "none" },
        target: "packet",
      });
      expect(out).toContain("Chậm chắc");
      expect(out).toContain("exploration");
      expect(out).toContain("KHÔNG include romantic subplot");
    });
  });

  describe("compact intensity", () => {
    it("renders abbreviated guidance for compact mode", () => {
      const full = buildStoryOptionsBlock({
        storyOptions: { tone: "serious", pacing: "fast", darkLevel: "dark" },
        target: "writer",
        intensity: "full",
      });
      const compact = buildStoryOptionsBlock({
        storyOptions: { tone: "serious", pacing: "fast", darkLevel: "dark" },
        target: "writer",
        intensity: "compact",
      });
      // Compact should be shorter
      expect(compact.length).toBeLessThan(full.length);
      // Both should have the header
      expect(compact).toContain("STORY OPTIONS CONTRACT");
      expect(compact).toContain("Nghiêm túc");
    });
  });

  describe("cross-option interactions", () => {
    it("renders dark + comedy interaction note", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { darkLevel: "dark", comedyLevel: "medium" },
        target: "writer",
      });
      expect(out).toContain("CROSS-OPTION INTERACTIONS");
      expect(out).toContain("Gallows humor");
    });

    it("renders modern era + cultivation interaction note", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { worldEra: "modern", powerSystemStyle: "realm" },
        target: "writer",
      });
      expect(out).toContain("CROSS-OPTION INTERACTIONS");
      expect(out).toContain("Modern era + Cultivation");
      expect(out).toContain("hidden societies");
    });

    it("renders fast pacing + heavy romance interaction note", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "fast", romanceLevel: "heavy" },
        target: "writer",
      });
      expect(out).toContain("CROSS-OPTION INTERACTIONS");
      expect(out).toContain("Fast pacing + Heavy romance");
    });

    it("does NOT render interaction notes when not applicable", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { tone: "serious" },
        target: "writer",
      });
      expect(out).not.toContain("CROSS-OPTION INTERACTIONS");
    });
  });

  // ─── Snapshot scenarios per requirements ────────────────────────────────────

  describe("scenario snapshots", () => {
    it("modern era + cultivation genre (powerSystem realm)", () => {
      const opts: StoryOptions = {
        worldEra: "modern",
        powerSystemStyle: "realm",
        tone: "serious",
        pacing: "medium",
      };
      const bible = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "bible",
      });
      const writer = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "writer",
      });

      // Bible: modern era guidance must have anti-drift
      expect(bible).toContain("ANTI-DRIFT");
      expect(bible).toContain("KHÔNG có tông môn cổ đại");
      // Bible: cultivation must have realm definition requirement
      expect(bible).toContain("PHẢI định nghĩa");
      expect(bible).toContain("cảnh giới");
      // Cross-interaction in both
      expect(bible).toContain("Modern era + Cultivation");
      expect(writer).toContain("Modern era + Cultivation");
      // Writer: modern writing rules
      expect(writer).toContain("Hiện đại");
      expect(writer).toContain("buildings, streets");
    });

    it("high comedy + dark level medium", () => {
      const opts: StoryOptions = {
        comedyLevel: "heavy",
        darkLevel: "neutral",
      };
      const writer = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "writer",
      });

      // Heavy comedy rules
      expect(writer).toContain("Comedy nhiều");
      expect(writer).toContain("running gags");
      expect(writer).toContain("KHÔNG ĐƯỢC destroy stakes");
      // Neutral dark
      expect(writer).toContain("Trung tính");
      // Interaction note (neutral + heavy comedy)
      expect(writer).toContain("CROSS-OPTION INTERACTIONS");
      expect(writer).toContain("Comedy cần respect tonal weight");
    });

    it("high romance + fast pacing", () => {
      const opts: StoryOptions = {
        romanceLevel: "heavy",
        pacing: "fast",
      };
      const writer = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "writer",
      });

      // Fast pacing rules
      expect(writer).toContain("Nhanh");
      expect(writer).toContain("Entry state ≠ exit state");
      // Heavy romance rules
      expect(writer).toContain("Romance nhiều");
      expect(writer).toContain("30-40% content");
      // Interaction
      expect(writer).toContain("Fast pacing + Heavy romance");
      expect(writer).toContain("tight và impactful");
    });

    it("bloodline/realm power system + xuanhuan-style genre", () => {
      const opts: StoryOptions = {
        powerSystemStyle: "realm",
        worldEra: "otherworld",
        tone: "serious",
        mainConflictType: "growth",
      };
      const bible = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "bible",
      });

      // Realm power system requirements
      expect(bible).toContain("Cảnh giới");
      expect(bible).toContain("PHẢI định nghĩa");
      expect(bible).toContain("đột phá");
      expect(bible).toContain("linh thạch");
      // Otherworld era
      expect(bible).toContain("Dị giới");
      expect(bible).toContain("internally consistent");
      // Growth conflict
      expect(bible).toContain("Trưởng thành");
      expect(bible).toContain("starting state rõ ràng");
    });

    it("third person limited POV", () => {
      const opts: StoryOptions = {
        pov: "third_limited",
      };
      const writer = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "writer",
      });
      const validator = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "validator",
      });

      // Writer rules
      expect(writer).toContain("Ngôi ba giới hạn");
      expect(writer).toContain("1 POV character");
      expect(writer).toContain("KHÔNG hidden knowledge leaks");
      expect(writer).toContain("Head-hopping");
      // Validator rules
      expect(validator).toContain("Flag");
      expect(validator).toContain("thoughts of non-POV character");
      expect(validator).toContain("POV switches within a scene");
      expect(validator).toContain("omniscient perspective");
    });

    it("antihero protagonist morality", () => {
      const opts: StoryOptions = {
        protagonistMorality: "antihero",
        tone: "dark",
      };
      const writer = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "writer",
      });
      const validator = buildStoryOptionsBlock({
        storyOptions: opts,
        target: "validator",
      });

      // Writer: antihero rules
      expect(writer).toContain("Phản anh hùng");
      expect(writer).toContain("ruthless");
      expect(writer).toContain("humanity");
      expect(writer).toContain("Antihero ≠ villain");
      // Writer: dark tone rules
      expect(writer).toContain("U tối");
      expect(writer).toContain("oppressive");
      // Validator: correct flagging behavior
      expect(validator).toContain("KHÔNG flag ruthless actions");
      expect(validator).toContain("pure evil");
    });
  });

  describe("option-specific semantic strength", () => {
    it("mainConflictType includes anti-replacement warning", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { mainConflictType: "revenge" },
        target: "writer",
      });
      expect(out).toContain("CẢNH BÁO");
      expect(out).toContain("KHÔNG thay thế");
      expect(out).toContain("generic cultivation/adventure");
    });

    it("powerSystemStyle realm overrides genre defaults in bible", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { powerSystemStyle: "realm" },
        target: "bible",
      });
      expect(out).toContain("QUAN TRỌNG");
      expect(out).toContain("powerSystemStyle đã chọn là REALM/CULTIVATION");
    });

    it("worldEra ancient has explicit anti-drift rules", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { worldEra: "ancient" },
        target: "writer",
      });
      expect(out).toContain("ANTI-DRIFT");
      expect(out).toContain("gọi điện");
      expect(out).toContain("lên mạng");
    });

    it("worldEra modern has explicit anti-drift rules", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { worldEra: "modern" },
        target: "writer",
      });
      expect(out).toContain("ANTI-DRIFT");
      expect(out).toContain("ancient cultivator");
    });

    it("pov first person has strict knowledge limitation", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pov: "first" },
        target: "writer",
      });
      expect(out).toContain("KHÔNG THỂ biết thoughts of others");
      expect(out).toContain("KHÔNG BAO GIỜ");
    });

    it("protagonistMorality righteous has clear behavioral boundaries", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { protagonistMorality: "righteous" },
        target: "writer",
      });
      expect(out).toContain("Chính đạo");
      expect(out).toContain("hard-right over easy-wrong");
      expect(out).toContain("tortures helpless enemies");
    });

    it("comedyLevel heavy has stakes-protection warning", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { comedyLevel: "heavy" },
        target: "writer",
      });
      expect(out).toContain("CẢNH BÁO QUAN TRỌNG");
      expect(out).toContain("KHÔNG ĐƯỢC destroy stakes");
    });

    it("romanceLevel none is strict about avoiding romance", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { romanceLevel: "none" },
        target: "writer",
      });
      expect(out).toContain("KHÔNG viết scenes focused on romantic attraction");
    });

    it("pacing climax_heavy has intensity requirements", () => {
      const out = buildStoryOptionsBlock({
        storyOptions: { pacing: "climax_heavy" },
        target: "writer",
      });
      expect(out).toContain("Liên tục cao trào");
      expect(out).toContain("peak intensity");
      expect(out).toContain("ticking clock");
    });
  });
});
