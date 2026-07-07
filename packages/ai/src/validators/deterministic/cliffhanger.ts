import type { CheckInput, CheckResult, DeterministicCheck } from "./types.ts";

export const cliffhangerCheck: DeterministicCheck = {
  id: "cliffhanger",
  severity: "low",
  run(input: CheckInput): CheckResult {
    void input;
    return { pass: true, issues: [] };
  },
};
