import { describe, expect, it } from "vitest";
import {
  computeProgressPercent,
  progressPhaseFor,
} from "../../src/context/builder.js";

describe("computeProgressPercent", () => {
  it("returns 100% on the final chapter of a multi-chapter span", () => {
    expect(computeProgressPercent(10, 1, 10)).toBe(100);
  });

  it("returns 100% on a single-chapter span", () => {
    expect(computeProgressPercent(5, 5, 5)).toBe(100);
  });

  it("returns 10% on the first chapter of a 10-chapter span", () => {
    expect(computeProgressPercent(1, 1, 10)).toBe(10);
  });

  it("clamps when chapterNumber is outside the span", () => {
    expect(computeProgressPercent(0, 1, 10)).toBe(0);
    expect(computeProgressPercent(99, 1, 10)).toBe(100);
  });
});

describe("progressPhaseFor", () => {
  it("labels < 30% as setup", () => {
    expect(progressPhaseFor(10)).toBe("setup");
    expect(progressPhaseFor(29)).toBe("setup");
  });

  it("labels 30–59% as development", () => {
    expect(progressPhaseFor(30)).toBe("development");
    expect(progressPhaseFor(59)).toBe("development");
  });

  it("labels 60–79% as climax_buildup", () => {
    expect(progressPhaseFor(60)).toBe("climax_buildup");
    expect(progressPhaseFor(79)).toBe("climax_buildup");
  });

  it("labels >= 80% as climax", () => {
    expect(progressPhaseFor(80)).toBe("climax");
    expect(progressPhaseFor(100)).toBe("climax");
  });

  it("returns null when input is null", () => {
    expect(progressPhaseFor(null)).toBeNull();
  });
});
