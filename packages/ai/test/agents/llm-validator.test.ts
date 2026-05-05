import { describe, it, expect } from "vitest";
import { LlmValidatorAgent } from "../../src/agents/llm-validator.ts";
import { MockProvider } from "../../src/providers/mock.ts";
import "../../src/prompts/llm-validator.v2.ts";

const VALID_VALIDATOR_OUTPUT = JSON.stringify({
  pass: true,
  issues: [],
  summary: "Chương hợp lệ, không có vấn đề.",
});

const INVALID_VALIDATOR_OUTPUT = JSON.stringify({
  pass: false,
  issues: [
    {
      code: "dead_character",
      severity: "critical",
      message: "Nhân vật đã chết",
    },
  ],
  summary: "Phát hiện 1 vấn đề.",
});

describe("LlmValidatorAgent", () => {
  it("returns parsed validator output", async () => {
    const provider = new MockProvider({
      responder: { kind: "fixed", content: VALID_VALIDATOR_OUTPUT },
    });
    const agent = new LlmValidatorAgent({ provider });

    const result = await agent.validate({
      serializedContext: "context",
      chapterContent: "content",
      chapterTitle: "Chương 5",
      chapterNumber: 5,
      storyId: "story-1",
      traceId: "trace-1",
      genreDef: {
        slug: "tien_hiep",
        viLabel: "Tiên hiệp",
        viDescription: "",
        family: "cultivation",
        allowedTropes: [],
        discouragedTropes: [],
        toneGuidance: "",
        worldbuildingGuidance: "",
        examplePremises: [],
      } as any,
      personalityDef: {
        slug: "tram_on",
        viLabel: "",
        viDescription: "",
        voiceHints: "",
        decisionStyle: "",
        dialogueStyle: "",
        conflictResponse: "",
        driftSignals: [],
      } as any,
      storyOptions: {} as any,
    });

    expect(result.output.pass).toBe(true);
    expect(result.output.issues).toHaveLength(0);
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.cost).toBe(0);

    const calls = provider.getCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.metadata!.agentRole).toBe("llm_validator");
  });

  it("surfaces weak_cliffhanger and repetition issues from LLM output", async () => {
    const weakCliffhangerOutput = JSON.stringify({
      pass: false,
      issues: [
        {
          code: "weak_cliffhanger",
          severity: "low",
          message: "Cliffhanger quá yếu, không đủ hook.",
        },
        {
          code: "repetition",
          severity: "low",
          message: "Cụm 'ánh mắt lạnh lùng' lặp 4 lần trong chương.",
        },
      ],
      summary: "Phát hiện 2 vấn đề phong cách.",
    });
    const provider = new MockProvider({
      responder: { kind: "fixed", content: weakCliffhangerOutput },
    });
    const agent = new LlmValidatorAgent({ provider });
    const result = await agent.validate({
      serializedContext: "context",
      chapterContent: "ánh mắt lạnh lùng... ánh mắt lạnh lùng...",
      chapterTitle: "Ch 6",
      chapterNumber: 6,
      storyId: "s1",
      traceId: "t1",
      genreDef: {
        slug: "tien_hiep",
        viLabel: "Tiên hiệp",
        viDescription: "",
        family: "cultivation",
        allowedTropes: [],
        discouragedTropes: [],
        toneGuidance: "",
        worldbuildingGuidance: "",
        examplePremises: [],
      } as any,
      personalityDef: {
        slug: "tram_on",
        viLabel: "",
        viDescription: "",
        voiceHints: "",
        decisionStyle: "",
        dialogueStyle: "",
        conflictResponse: "",
        driftSignals: [],
      } as any,
      storyOptions: {} as any,
    });
    expect(result.output.pass).toBe(false);
    const codes = result.output.issues.map((i) => i.code);
    expect(codes).toContain("weak_cliffhanger");
    expect(codes).toContain("repetition");
  });

  it("returns issues when validator flags problems", async () => {
    const provider = new MockProvider({
      responder: { kind: "fixed", content: INVALID_VALIDATOR_OUTPUT },
    });
    const agent = new LlmValidatorAgent({ provider });

    const result = await agent.validate({
      serializedContext: "context",
      chapterContent: "content with dead character",
      chapterTitle: "Ch 5",
      chapterNumber: 5,
      storyId: "s1",
      traceId: "t1",
      genreDef: {
        slug: "tien_hiep",
        viLabel: "Tiên hiệp",
        viDescription: "",
        family: "cultivation",
        allowedTropes: [],
        discouragedTropes: [],
        toneGuidance: "",
        worldbuildingGuidance: "",
        examplePremises: [],
      } as any,
      personalityDef: {
        slug: "tram_on",
        viLabel: "",
        viDescription: "",
        voiceHints: "",
        decisionStyle: "",
        dialogueStyle: "",
        conflictResponse: "",
        driftSignals: [],
      } as any,
      storyOptions: {} as any,
    });

    expect(result.output.pass).toBe(false);
    expect(result.output.issues).toHaveLength(1);
    expect(result.output.issues[0]!.code).toBe("dead_character");
  });
});
