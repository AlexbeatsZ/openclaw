// Control UI module implements cron status behavior.
import type { CronJob, CronRunStatus } from "../api/types.ts";

type CronJobLastRunStatus = CronRunStatus | "unknown";

export function resolveCronJobLastRunStatus(job: CronJob): CronJobLastRunStatus {
  if (job.lastRunStatus) {
    return job.lastRunStatus;
  }
  const state = job.state;
  const persistedStatus = state?.lastRunStatus ?? state?.lastStatus;
  const triggerRecovered =
    persistedStatus === "error" &&
    state?.consecutiveErrors === 0 &&
    typeof state.lastRunAtMs === "number" &&
    typeof state.lastTriggerEvalAtMs === "number" &&
    state.lastTriggerEvalAtMs > state.lastRunAtMs;
  return triggerRecovered ? "ok" : (persistedStatus ?? "unknown");
}

export function resolveCronJobLastRunAtMs(job: CronJob): number | undefined {
  if (typeof job.lastRunAtMs === "number") {
    return job.lastRunAtMs;
  }
  const state = job.state;
  return resolveCronJobLastRunStatus(job) === "ok" &&
    state?.consecutiveErrors === 0 &&
    typeof state.lastTriggerEvalAtMs === "number" &&
    typeof state.lastRunAtMs === "number" &&
    state.lastTriggerEvalAtMs > state.lastRunAtMs
    ? state.lastTriggerEvalAtMs
    : state?.lastRunAtMs;
}

// "Failed cron" surfaces (cron page, sidebar attention chips) track current
// actionability, so a failure only counts while the job is still enabled.
// Disabled jobs keep their historical `lastRunStatus: "error"` for detail
// views, but a retired job must not be reported as an active problem.
export function isCronJobActiveFailure(job: CronJob): boolean {
  return job.enabled && resolveCronJobLastRunStatus(job) === "error";
}
