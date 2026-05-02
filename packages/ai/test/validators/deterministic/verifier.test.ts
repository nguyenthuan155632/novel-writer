import { describe, it, expect, vi } from "vitest";
import { verifyDeterministicFindings } from "../../../src/validators/deterministic/verifier.ts";
import type { PendingVerificationItem } from "../../../src/validators/deterministic/types.ts";
import type {
  LLMProvider,
  CompletionResponse,
} from "../../../src/providers/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockProvider(response: string): LLMProvider {
  return {
    name: "mock",
    complete: vi.fn().mockResolvedValue({
      content: response,
      usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: 0 },
      finishReason: "stop",
      raw: {},
    } satisfies CompletionResponse),
  };
}

function failingProvider(): LLMProvider {
  return {
    name: "mock",
    complete: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
  };
}

const silentLogger = {
  info: vi.fn(),
  warn: vi.fn(),
};

const SAMPLE_ITEMS: PendingVerificationItem[] = [
  {
    checkId: "unknown_character",
    severity: "medium",
    issue:
      'Nhân vật "Nhưng Lâm Phong" không có trong danh sách known characters.',
    snippet: "Nhưng Lâm Phong đã bước tới, ánh mắt lạnh lẽo quét qua đám đông",
  },
  {
    checkId: "unknown_location",
    severity: "low",
    issue: 'Địa danh "Tụ Khí" không nằm trong danh sách known locations.',
    snippet: "đột phá đến Tụ Khí cảnh giới, hắn cảm thấy sức mạnh tràn ngập",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("verifyDeterministicFindings", () => {
  it("returns empty results and makes no LLM call for empty items", async () => {
    const provider = mockProvider("{}");
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      [],
    );

    expect(result.confirmed).toEqual([]);
    expect(result.dismissed).toEqual([]);
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("confirms all items when LLM confirms all", async () => {
    const response = JSON.stringify({
      verdicts: [
        { index: 1, verdict: "confirm", reason: "Đây là nhân vật mới" },
        { index: 2, verdict: "confirm", reason: "Đây là địa danh mới" },
      ],
    });
    const provider = mockProvider(response);
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      SAMPLE_ITEMS,
    );

    expect(result.confirmed).toHaveLength(2);
    expect(result.dismissed).toHaveLength(0);
    expect(result.confirmed[0]).toEqual({
      checkId: "unknown_character",
      severity: "medium",
      issue: SAMPLE_ITEMS[0]!.issue,
    });
    expect(result.confirmed[1]).toEqual({
      checkId: "unknown_location",
      severity: "low",
      issue: SAMPLE_ITEMS[1]!.issue,
    });
  });

  it("dismisses all items when LLM dismisses all", async () => {
    const response = JSON.stringify({
      verdicts: [
        {
          index: 1,
          verdict: "dismiss",
          reason: '"Nhưng" là liên từ, không phải tên nhân vật',
        },
        {
          index: 2,
          verdict: "dismiss",
          reason: "Tụ Khí là cảnh giới tu luyện, không phải địa danh",
        },
      ],
    });
    const provider = mockProvider(response);
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      SAMPLE_ITEMS,
    );

    expect(result.confirmed).toHaveLength(0);
    expect(result.dismissed).toHaveLength(2);
    expect(result.dismissed[0]).toEqual({
      checkId: "unknown_character",
      issue: SAMPLE_ITEMS[0]!.issue,
      reason: '"Nhưng" là liên từ, không phải tên nhân vật',
    });
    expect(result.dismissed[1]).toEqual({
      checkId: "unknown_location",
      issue: SAMPLE_ITEMS[1]!.issue,
      reason: "Tụ Khí là cảnh giới tu luyện, không phải địa danh",
    });
  });

  it("splits items correctly when LLM dismisses some and confirms others", async () => {
    const response = JSON.stringify({
      verdicts: [
        {
          index: 1,
          verdict: "dismiss",
          reason: '"Nhưng" là liên từ viết hoa đầu câu',
        },
        { index: 2, verdict: "confirm", reason: "Địa danh chưa được khai báo" },
      ],
    });
    const provider = mockProvider(response);
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      SAMPLE_ITEMS,
    );

    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]).toEqual({
      checkId: "unknown_location",
      severity: "low",
      issue: SAMPLE_ITEMS[1]!.issue,
    });

    expect(result.dismissed).toHaveLength(1);
    expect(result.dismissed[0]).toEqual({
      checkId: "unknown_character",
      issue: SAMPLE_ITEMS[0]!.issue,
      reason: '"Nhưng" là liên từ viết hoa đầu câu',
    });
  });

  it("on LLM failure confirms only high/critical items and dismisses the rest", async () => {
    const provider = failingProvider();
    const itemsWithHigh: PendingVerificationItem[] = [
      {
        checkId: "realm_jump",
        severity: "high",
        issue: "Phát hiện 5 lần đột phá trong 1 chương.",
        snippet: "...đột phá...",
      },
      ...SAMPLE_ITEMS, // medium + low
    ];
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      itemsWithHigh,
    );

    // Only the high-severity item is confirmed
    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]!.checkId).toBe("realm_jump");
    // medium and low are dismissed by fallback policy
    expect(result.dismissed).toHaveLength(2);
    expect(result.dismissed[0]!.checkId).toBe("unknown_character");
    expect(result.dismissed[1]!.checkId).toBe("unknown_location");
    // Zero usage on network failure
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    });
  });

  it("conservatively confirms all items when LLM returns malformed JSON", async () => {
    const provider = mockProvider("this is not valid json {{{");
    const result = await verifyDeterministicFindings(
      { provider, model: "test-model", logger: silentLogger },
      SAMPLE_ITEMS,
    );

    expect(provider.complete).toHaveBeenCalledOnce();
    expect(result.confirmed).toHaveLength(2);
    expect(result.dismissed).toHaveLength(0);
    expect(result.confirmed[0]!.checkId).toBe("unknown_character");
    expect(result.confirmed[1]!.checkId).toBe("unknown_location");
    // Usage is still reported from the response that came back
    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cachedInputTokens: 0,
    });
  });
});
