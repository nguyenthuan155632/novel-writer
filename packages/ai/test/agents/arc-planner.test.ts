import { describe, it, expect, vi } from "vitest";
import { ArcPlannerAgent } from "../../src/agents/arc-planner.ts";
import { MockProvider } from "../../src/providers/mock.ts";
import type { Logger } from "../../src/agents/packet-generator.ts";
import "../../src/prompts/arc-planner.v2.ts";

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
};

// Saga (mocked below) has 2 turning points, so the third arc is a pure
// development arc with an empty coveredTurningPoints.
const VALID_OUTPUT = JSON.stringify({
  arcs: Array.from({ length: 3 }, (_, i) => ({
    index: i,
    title: `Arc ${i}`,
    premise: "p ".repeat(30).trim(),
    startChapter: i * 33 + 1,
    endChapter: (i + 1) * 33,
    expectedChanges: ["change happens here enough text"],
    coveredTurningPoints: i < 2 ? [i] : [],
  })),
});

let selectCallCount = 0;
vi.mock("@novel/db", () => ({
  getDb: () => ({
    select: () => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: "sa",
                  startChapter: 1,
                  endChapter: 100,
                  title: "S",
                  premise: "p",
                  expectedTurningPoints: ["t1", "t2"],
                },
              ],
            }),
          }),
        };
      }
      return { from: () => ({ where: async () => [] }) };
    },
    transaction: async (fn: Function) =>
      fn({
        insert: async () => {},
        update: async () => {},
        select: () => ({
          from: () => ({ where: () => ({ limit: async () => [] }) }),
        }),
      }),
  }),
}));

vi.mock("@novel/db/schema", () => ({
  sagas: {} as any,
  plantedSeeds: {} as any,
  arcs: {} as any,
}));

describe("ArcPlannerAgent.plan (mocked db)", () => {
  it("parses output via Zod", async () => {
    selectCallCount = 0;
    const provider = new MockProvider({
      responder: { kind: "fixed", content: VALID_OUTPUT },
    });
    const agent = new ArcPlannerAgent({ provider, logger: silentLogger });
    const r = await agent.plan({
      storyId: "s",
      sagaId: "sa",
      currentState: "state",
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
      storyOptions: {} as any,
    });
    expect(r.output.arcs).toHaveLength(3);
  });

  it("uses the injected model route", async () => {
    selectCallCount = 0;
    const provider = new MockProvider({
      responder: { kind: "fixed", content: VALID_OUTPUT },
    });
    const agent = new ArcPlannerAgent({
      provider,
      logger: silentLogger,
      model: "gemma4:e4b",
    });

    await agent.plan({
      storyId: "s",
      sagaId: "sa",
      currentState: "state",
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
      storyOptions: {} as any,
    });

    expect(provider.getCalls()[0]!.model).toBe("gemma4:e4b");
  });

  it("fills common missing arc metadata from provider JSON", async () => {
    selectCallCount = 0;
    const provider = new MockProvider({
      responder: {
        kind: "fixed",
        content: JSON.stringify({
          arcs: Array.from({ length: 3 }, (_, i) => ({
            title: `Arc ${i}`,
            premise: "p ".repeat(30).trim(),
            expectedChanges: ["change happens here enough text"],
            coveredTurningPoints: i < 2 ? [i] : [],
          })),
        }),
      },
    });
    const agent = new ArcPlannerAgent({ provider, logger: silentLogger });

    const r = await agent.plan({
      storyId: "s",
      sagaId: "sa",
      currentState: "state",
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
      storyOptions: {} as any,
    });

    expect(r.output.arcs.map((arc) => arc.index)).toEqual([0, 1, 2]);
    expect(r.output.arcs.map((arc) => [arc.startChapter, arc.endChapter])).toEqual([
      [1, 33],
      [34, 66],
      [67, 100],
    ]);
  });

  it("re-prompts when a turning point is left unallocated", async () => {
    selectCallCount = 0;
    // Saga has 2 turning points but this output only covers index 0 —
    // turning point 1 is dropped, so coverage validation must reject it.
    const invalidOutput = JSON.stringify({
      arcs: Array.from({ length: 3 }, (_, i) => ({
        index: i,
        title: `Arc ${i}`,
        premise: "p ".repeat(30).trim(),
        startChapter: i * 33 + 1,
        endChapter: (i + 1) * 33,
        expectedChanges: ["change happens here enough text"],
        coveredTurningPoints: i === 0 ? [0] : [],
      })),
    });
    let call = 0;
    const provider = new MockProvider({
      responder: {
        kind: "fn",
        fn: () => ({
          content: call++ === 0 ? invalidOutput : VALID_OUTPUT,
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
          raw: {},
        }),
      },
    });
    const agent = new ArcPlannerAgent({ provider, logger: silentLogger });

    const r = await agent.plan({
      storyId: "s",
      sagaId: "sa",
      currentState: "state",
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
      storyOptions: {} as any,
    });

    expect(call).toBe(2);
    expect(r.output.arcs).toHaveLength(3);
  });

  it("normalizes common arc title aliases", async () => {
    selectCallCount = 0;
    const provider = new MockProvider({
      responder: {
        kind: "fixed",
        content: JSON.stringify({
          arcs: [
            {
              arcTitle: "Alias Arc 0",
              premise: "p ".repeat(30).trim(),
              expectedChanges: ["change happens here enough text"],
              coveredTurningPoints: [0],
            },
            {
              name: "Alias Arc 1",
              premise: "p ".repeat(30).trim(),
              expectedChanges: ["change happens here enough text"],
              coveredTurningPoints: [1],
            },
          ],
        }),
      },
    });
    const agent = new ArcPlannerAgent({ provider, logger: silentLogger });

    const r = await agent.plan({
      storyId: "s",
      sagaId: "sa",
      currentState: "state",
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
      storyOptions: {} as any,
    });

    expect(r.output.arcs.map((arc) => arc.title)).toEqual([
      "Alias Arc 0",
      "Alias Arc 1",
    ]);
  });
});
