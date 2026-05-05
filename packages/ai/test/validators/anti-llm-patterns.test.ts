import { describe, expect, it } from "vitest";
import { findAntiLlmPatternHits } from "../../src/validators/anti-llm-patterns.ts";

describe("findAntiLlmPatternHits", () => {
  it("flags forbidden phrase hits and low-severity heuristics", () => {
    const content = [
      "lập tức hắn hít một hơi sâu...",
      "không khí bỗng trầm xuống...",
      "Hắn hít một hơi sâu rồi hít một hơi sâu... rồi hít một hơi sâu...",
      "LAMTRACH LAMTRACH LAMTRACH gầm lên!! rồi quát nữa!!",
    ].join("\n\n");

    const hits = findAntiLlmPatternHits(content);
    expect(hits.map((hit) => hit.code)).toEqual(
      expect.arrayContaining([
        "anti_llm_instantly",
        "anti_llm_taking_deep_breath",
        "anti_llm_ellipsis_overuse",
        "anti_llm_exclamation_overuse",
        "anti_llm_repeated_name",
      ]),
    );
    expect(hits.every((hit) => hit.severity === "low")).toBe(true);
  });

  it("returns clean pass for normal prose", () => {
    const content = [
      "Lam Trạch bước qua cầu đá, nghe tiếng nước đập vào vách núi.",
      "Hắn dừng lại một nhịp để quan sát trận pháp trước cửa điện.",
      "Mỗi cử động đều nhằm kiểm chứng nghi ngờ đã âm ỉ từ cuối chương trước.",
    ].join("\n\n");

    expect(findAntiLlmPatternHits(content)).toEqual([]);
  });
});
