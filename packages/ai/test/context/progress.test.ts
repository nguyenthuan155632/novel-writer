import { describe, expect, it } from "vitest";
import {
  computeProgressPercent,
  computeProgressWindow,
  progressPhaseFor,
} from "../../src/context/progress.js";

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

describe("computeProgressWindow", () => {
  it("uses planned range when start and end are present", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 5,
        startChapter: 1,
        endChapter: 10,
        fallbackEndChapter: 100,
      }),
    ).toEqual({
      percent: 50,
      range: "5/10",
      startChapter: 1,
      endChapter: 10,
      source: "planned_range",
    });
  });

  it("uses story target fallback when end is missing", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 25,
        startChapter: 1,
        endChapter: null,
        fallbackEndChapter: 100,
        fallbackSource: "story_target_fallback",
      }),
    ).toEqual({
      percent: 25,
      range: "25/100",
      startChapter: 1,
      endChapter: 100,
      source: "story_target_fallback",
    });
  });

  it("uses chapter 1 as conservative start when only end is present", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 10,
        startChapter: null,
        endChapter: 20,
        fallbackEndChapter: null,
      }),
    ).toEqual({
      percent: 50,
      range: "10/20",
      startChapter: 1,
      endChapter: 20,
      source: "planned_range",
    });
  });

  it("returns null when no end boundary can be derived", () => {
    expect(
      computeProgressWindow({
        chapterNumber: 5,
        startChapter: 1,
        endChapter: null,
        fallbackEndChapter: null,
      }),
    ).toBeNull();
  });
});
