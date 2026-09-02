/** User-facing cron health projection kept separate from persisted run history. */
import { asDateTimestampMs } from "@openclaw/normalization-core/number-coercion";
import type { CronJob } from "../types.js";
import { resolveJobLastRunStatus } from "./jobs-scheduling.js";

function isFiniteTimestamp(value: unknown): value is number {
  return asDateTimestampMs(value) !== undefined;
}

/** Resolves current operator-facing health without rewriting payload run history. */
export function resolveJobHealthState(job: Pick<CronJob, "state" | "trigger">) {
  const lastRunStatus = resolveJobLastRunStatus(job);
  const lastRunAtMs = job.state.lastRunAtMs;
  const lastTriggerEvalAtMs = job.state.lastTriggerEvalAtMs;
  const triggerRecovered =
    job.trigger !== undefined &&
    lastRunStatus === "error" &&
    job.state.consecutiveErrors === 0 &&
    isFiniteTimestamp(lastRunAtMs) &&
    isFiniteTimestamp(lastTriggerEvalAtMs) &&
    lastTriggerEvalAtMs > lastRunAtMs;
  if (triggerRecovered) {
    return {
      lastRunStatus: "ok" as const,
      lastRunAtMs: lastTriggerEvalAtMs,
      lastRunError: undefined,
    };
  }
  return {
    lastRunStatus,
    lastRunAtMs,
    lastRunError: job.state.lastError,
  };
}
