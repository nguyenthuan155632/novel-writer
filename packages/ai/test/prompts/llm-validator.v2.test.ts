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
});
