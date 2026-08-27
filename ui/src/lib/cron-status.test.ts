import { describe, expect, it } from "vitest";
import type { CronJob } from "../api/types.ts";
import {
  isCronJobActiveFailure,
  resolveCronJobLastRunAtMs,
  resolveCronJobLastRunStatus,
} from "./cron-status.ts";

function failedJob(enabled: boolean): CronJob {
  return {
    enabled,
    state: { lastRunStatus: "error" },
  } as CronJob;
}

describe("isCronJobActiveFailure", () => {
  it("reports only enabled failed jobs as actionable", () => {
    expect(isCronJobActiveFailure(failedJob(true))).toBe(true);
    expect(isCronJobActiveFailure(failedJob(false))).toBe(false);
  });

  it("does not keep a trigger job failed after a newer successful evaluation", () => {
    const job = {
      enabled: true,
      state: {
        lastRunAtMs: 1_000,
        lastRunStatus: "error",
        lastError: "temporary network failure",
        consecutiveErrors: 0,
        lastTriggerEvalAtMs: 2_000,
      },
    } as CronJob;

    expect(resolveCronJobLastRunStatus(job)).toBe("ok");
    expect(resolveCronJobLastRunAtMs(job)).toBe(2_000);
    expect(isCronJobActiveFailure(job)).toBe(false);
  });

  it("keeps an unrecovered trigger evaluation failure actionable", () => {
    const job = {
      enabled: true,
      state: {
        lastRunAtMs: 1_000,
        lastRunStatus: "error",
        consecutiveErrors: 1,
        lastTriggerEvalAtMs: 1_000,
      },
    } as CronJob;

    expect(resolveCronJobLastRunStatus(job)).toBe("error");
    expect(isCronJobActiveFailure(job)).toBe(true);
  });
});
