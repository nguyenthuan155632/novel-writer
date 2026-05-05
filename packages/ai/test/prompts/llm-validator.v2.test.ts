import { describe, it, expect } from "vitest";
import { findGenre, findPersonality } from "@novel/core";
import { llmValidatorPromptV2 } from "../../src/prompts/llm-validator.v2.ts";

describe("llmValidatorPromptV2", () => {
  it("system prompt enumerates 7 criteria including genre drift and personality drift", () => {
    const built = llmValidatorPromptV2.build({
      serializedContext: "C",
      chapterContent: "x",
      chapterTitle: "t",
      chapterNumber: 1,
      genreDef: findGenre("do_thi"),
      personalityDef: findPersonality("cunning_pragmatic"),
      storyOptions: {},
    });
    expect(built.system).toMatch(/6\.\s*Genre drift/);
    expect(built.system).toMatch(/7\.\s*Personality drift/);
    expect(built.system).toContain("Đô thị");
    expect(built.system).toContain("Gian xảo, thực dụng");
  });

  it("prompt names all 5 deterministic replacement concerns", () => {
    const built = llmValidatorPromptV2.build({
      serializedContext: "C",
      chapterContent: "x",
      chapterTitle: "t",
      chapterNumber: 1,
      genreDef: findGenre("tien_hiep"),
      personalityDef: findPersonality("cunning_pragmatic"),
      storyOptions: {},
    });
    // Cliffhanger strength
    expect(built.system).toMatch(/8\.\s*Cliffhanger strength/);
    // Conflict presence
    expect(built.system).toMatch(/9\.\s*Conflict presence/);
    // Style red flags
    expect(built.system).toMatch(/10\.\s*Style red flags/);
    // Repetition
    expect(built.system).toMatch(/11\.\s*Repetition/);
    // Tone-shift and dialogue-vs-description balance
    expect(built.system).toMatch(/12\.\s*Tone-shift/);
  });

  it("does not force cultivation realm wording for non-cultivation genres", () => {
    const built = llmValidatorPromptV2.build({
      serializedContext: "C",
      chapterContent: "x",
      chapterTitle: "t",
      chapterNumber: 1,
      genreDef: findGenre("do_thi"),
      personalityDef: findPersonality("cunning_pragmatic"),
      storyOptions: {},
    });

    expect(built.system).not.toContain("cảnh giới lệch tiến độ");
    expect(built.system).toContain("tiến triển sức mạnh/trạng thái lệch tiến độ");
  });
});
