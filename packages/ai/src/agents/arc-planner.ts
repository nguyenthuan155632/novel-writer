import { ZodError } from "zod";
import { getDb } from "@novel/db";
import { sagas, plantedSeeds, arcs } from "@novel/db/schema";
import { eq, and } from "drizzle-orm";
import { MODEL_CONFIG } from "@novel/core";
import type { LLMProvider } from "../providers/types.ts";
import { withCompletionRetryRaw } from "../parse-completion-json.ts";
import type { Logger } from "./packet-generator.ts";
import {
  ArcPlannerOutputSchema,
  ARC_PLANNER_JSON_SCHEMA,
  type ArcPlannerOutput,
} from "../schemas/arc.ts";
import { arcPlannerPromptV2 } from "../prompts/arc-planner.v2.ts";

export interface ArcPlannerInput {
  storyId: string;
  sagaId: string;
  currentState: string;
  genreDef: import("@novel/core").GenreDef;
  storyOptions: import("@novel/core").StoryOptions;
}

export interface ArcPlannerResult {
  output: ArcPlannerOutput;
  promptVersion: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
}

export type ArcPlannerDeps = {
  provider: LLMProvider;
  logger: Logger;
  model?: string;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeArcPlannerOutput(
  raw: unknown,
  sagaStart: number,
  sagaEnd: number,
): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const root = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(root.arcs)) return root;

  const arcsRaw = root.arcs as unknown[];
  const shouldInferChapterRanges = arcsRaw.every((arc) => {
    if (!arc || typeof arc !== "object" || Array.isArray(arc)) return false;
    const item = arc as Record<string, unknown>;
    return (
      asNumber(item.startChapter ?? item.start_chapter) === undefined &&
      asNumber(item.endChapter ?? item.end_chapter) === undefined
    );
  });
  const span = Math.max(1, sagaEnd - sagaStart + 1);
  const arcCount = Math.max(1, arcsRaw.length);

  root.arcs = arcsRaw.map((arc, i) => {
    if (!arc || typeof arc !== "object" || Array.isArray(arc)) return arc;
    const item = { ...(arc as Record<string, unknown>) };
    item.index =
      asNumber(item.index ?? item.arcNumber ?? item.arc_number) ?? i;
    item.title =
      item.title ?? item.arcTitle ?? item.arc_title ?? item.name ?? item.heading;
    item.startChapter = asNumber(item.startChapter ?? item.start_chapter);
    item.endChapter = asNumber(item.endChapter ?? item.end_chapter);

    if (shouldInferChapterRanges) {
      item.startChapter = sagaStart + Math.floor((span * i) / arcCount);
      item.endChapter =
        i === arcCount - 1
          ? sagaEnd
          : sagaStart + Math.floor((span * (i + 1)) / arcCount) - 1;
    }

    return item;
  });

  return root;
}

/**
 * Verifies every turning point (index 0..count-1) is covered by exactly one
 * arc. Duplicate coverage is already rejected by the schema refinement; this
 * catches missing or out-of-range turning points. Throws so the plan loop can
 * re-prompt the model.
 */
function assertTurningPointsCovered(
  output: ArcPlannerOutput,
  count: number,
): void {
  const covered = output.arcs.flatMap((a) => a.coveredTurningPoints);
  const coveredSet = new Set(covered);
  const missing: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!coveredSet.has(i)) missing.push(i);
  }
  const outOfRange = [...coveredSet].filter((i) => i >= count).sort((a, b) => a - b);
  if (missing.length === 0 && outOfRange.length === 0) return;
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`turning points chưa được phân bổ: [${missing.join(", ")}]`);
  }
  if (outOfRange.length > 0) {
    parts.push(`turning point index không tồn tại: [${outOfRange.join(", ")}]`);
  }
  throw new Error(parts.join("; "));
}

export class ArcPlannerAgent {
  constructor(private readonly deps: ArcPlannerDeps) {}

  async plan(input: ArcPlannerInput): Promise<ArcPlannerResult> {
    const db = getDb();
    const log = this.deps.logger.child({
      agent: "arc_planner",
      storyId: input.storyId,
      sagaId: input.sagaId,
    });

    const [saga] = await db
      .select()
      .from(sagas)
      .where(eq(sagas.id, input.sagaId))
      .limit(1);
    if (!saga) throw new Error(`Saga ${input.sagaId} not found`);

    const unresolvedSeeds = await db
      .select({
        seedKey: plantedSeeds.seedKey,
        description: plantedSeeds.description,
        payoffChapter: plantedSeeds.payoffChapter,
      })
      .from(plantedSeeds)
      .where(
        and(
          eq(plantedSeeds.storyId, input.storyId),
          eq(plantedSeeds.status, "pending"),
        ),
      );

    const sagaSeeds = unresolvedSeeds.filter((s) => {
      const pc = s.payoffChapter ?? 0;
      return pc >= (saga.startChapter ?? 0) && pc <= (saga.endChapter ?? 0);
    });

    const built = arcPlannerPromptV2.build({
      sagaTitle: saga.title,
      sagaStart: saga.startChapter,
      sagaEnd: saga.endChapter,
      sagaPremise: saga.premise ?? "",
      turningPoints: saga.expectedTurningPoints,
      currentState: input.currentState,
      unresolvedSeeds: sagaSeeds,
      genreDef: input.genreDef,
      storyOptions: input.storyOptions,
    } as Record<string, unknown>);

    const baseMessages = [
      { role: "system" as const, content: built.system },
      { role: "user" as const, content: built.user },
    ];

    // The model occasionally drops or duplicates a turning point across arcs.
    // withCompletionRetryRaw only retries transient model errors, so re-prompt
    // with the validation error before giving up.
    const turningPointCount = saga.expectedTurningPoints?.length ?? 0;
    const maxValidationRetries = 2;
    let messages: { role: "system" | "user" | "assistant"; content: string }[] =
      baseMessages;
    let parsed: ArcPlannerOutput | undefined;
    let lastResponse: Awaited<
      ReturnType<typeof this.deps.provider.complete>
    > | undefined;

    for (let attempt = 0; attempt <= maxValidationRetries; attempt++) {
      const response = await withCompletionRetryRaw(
        "arc_planner",
        async () =>
          this.deps.provider.complete({
            model: this.deps.model ?? MODEL_CONFIG.routes.arc_planner,
            messages,
            responseSchema: ARC_PLANNER_JSON_SCHEMA,
            temperature: 0.7,
            metadata: {
              agentRole: arcPlannerPromptV2.agentRole,
              promptVersion: arcPlannerPromptV2.version,
              storyId: input.storyId,
            },
          }),
        3,
      );
      lastResponse = response;

      try {
        const candidate = ArcPlannerOutputSchema.parse(
          normalizeArcPlannerOutput(
            JSON.parse(response.content),
            saga.startChapter ?? 1,
            saga.endChapter ?? saga.startChapter ?? 1,
          ),
        );
        assertTurningPointsCovered(candidate, turningPointCount);
        parsed = candidate;
        break;
      } catch (err) {
        if (attempt >= maxValidationRetries) {
          log.error(
            { err, raw: response.content.slice(0, 500) },
            "arc planner parse failed",
          );
          throw err;
        }
        const detail =
          err instanceof ZodError
            ? JSON.stringify(err.issues)
            : err instanceof Error
              ? err.message
              : `${err}`;
        log.info({ attempt, detail }, "arc planner re-prompt after validation");
        messages = [
          ...baseMessages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              `Kết quả trước không hợp lệ: ${detail}`,
              `Có đúng ${turningPointCount} turning points (index 0..${Math.max(0, turningPointCount - 1)}). Mỗi turning point phải thuộc đúng 1 arc và TẤT CẢ phải được phân bổ hết — không thiếu, không trùng. Một arc thuần phát triển/đệm có thể để coveredTurningPoints rỗng [].`,
              "Hãy trả lại DUY NHẤT 1 JSON object hợp lệ theo schema. Không markdown fence, không giải thích.",
            ].join("\n\n"),
          },
        ];
      }
    }

    if (!parsed || !lastResponse) {
      throw new Error("arc_planner: exhausted validation retries");
    }

    log.info({ arcCount: parsed.arcs.length }, "plan ok");
    return {
      output: parsed,
      promptVersion: arcPlannerPromptV2.version,
      usage: lastResponse.usage,
    };
  }

  async persist(
    storyId: string,
    sagaId: string,
    output: ArcPlannerOutput,
  ): Promise<{ arcsUpserted: number }> {
    const db = getDb();
    let count = 0;
    await db.transaction(async (tx) => {
      // Delete all existing arcs for this saga to ensure clean re-plan
      await tx
        .delete(arcs)
        .where(and(eq(arcs.storyId, storyId), eq(arcs.sagaId, sagaId)));
      for (const a of output.arcs) {
        await tx.insert(arcs).values({
          storyId,
          sagaId,
          arcNumber: a.index,
          title: a.title,
          premise: a.premise,
          startChapter: a.startChapter,
          endChapter: a.endChapter,
          expectedChanges: a.expectedChanges,
          seedsToResolveInArc: a.seedsToResolveInArc ?? [],
          coveredTurningPoints: a.coveredTurningPoints,
          summaryVersion: 0,
        });
        count++;
      }
    });
    return { arcsUpserted: count };
  }
}
