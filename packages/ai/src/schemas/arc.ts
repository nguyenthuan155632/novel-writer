import { z } from "zod";
import type { JsonSchema } from "../providers/types.ts";

export const ArcSchema = z
  .object({
    index: z.number().int().nonnegative(),
    title: z.string().min(3).max(120),
    premise: z.string().min(40).max(800),
    startChapter: z.number().int().positive(),
    endChapter: z.number().int().positive(),
    expectedChanges: z.array(z.string().min(10).max(200)).min(1).max(8),
    seedsToResolveInArc: z.array(z.string().min(3).max(120)).optional(),
    coveredTurningPoints: z.array(z.number().int().nonnegative()).min(1).max(4),
  })
  .refine((a) => a.endChapter > a.startChapter, {
    message: "endChapter must be greater than startChapter",
  });

export const ArcPlannerOutputSchema = z
  .object({
    arcs: z.array(ArcSchema).min(2).max(5),
    notes: z.string().max(800).optional(),
  })
  .refine(
    (o) => {
      const allTps = o.arcs.flatMap((a) => a.coveredTurningPoints);
      return new Set(allTps).size === allTps.length;
    },
    { message: "Turning points must not be duplicated across arcs" },
  );

export type ArcPlannerOutput = z.infer<typeof ArcPlannerOutputSchema>;

export const ARC_PLANNER_JSON_SCHEMA: JsonSchema = {
  type: "object",
  required: ["arcs"],
  additionalProperties: false,
  properties: {
    arcs: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        required: [
          "index",
          "title",
          "premise",
          "startChapter",
          "endChapter",
          "expectedChanges",
          "coveredTurningPoints",
        ],
        additionalProperties: false,
        properties: {
          index: { type: "integer", minimum: 0 },
          title: { type: "string" },
          premise: { type: "string" },
          startChapter: { type: "integer", minimum: 1 },
          endChapter: { type: "integer", minimum: 1 },
          expectedChanges: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 8,
          },
          seedsToResolveInArc: { type: "array", items: { type: "string" } },
          coveredTurningPoints: {
            type: "array",
            items: { type: "integer", minimum: 0 },
            minItems: 1,
            maxItems: 4,
          },
        },
      },
    },
    notes: { type: "string" },
  },
};
