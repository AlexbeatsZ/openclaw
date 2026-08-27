# Cron Trigger Health Projection

## Problem

A trigger evaluation can finish successfully without firing its payload. That quiet success updates `lastTriggerEvalAtMs`, resets `consecutiveErrors`, and intentionally leaves the previous payload run and delivery history unchanged.

If consumers read only `lastRunStatus`, a transient trigger failure remains visible as the current error after later evaluations have recovered. This produces stale failure filters, counters, and status badges even though the scheduler is healthy.

## Ownership

Persisted state keeps the historical run outcome. Retry and scheduling decisions continue to use `resolveJobLastRunStatus`; they must not reinterpret a historical error as a completed payload run.

`resolveJobHealthState` owns the current user-facing projection used by list filters and Gateway read views. A trigger is recovered only when all of the following are true:

- the job has a trigger;
- the persisted last run is `error`;
- `consecutiveErrors` is zero;
- `lastTriggerEvalAtMs` is newer than `lastRunAtMs`.

The projected status is then `ok`, its activity timestamp is `lastTriggerEvalAtMs`, and the historical error is omitted from the projection. The nested persisted `state` remains unchanged for diagnostics and run history.

## Consumer contract

- Cron list filtering and failure counts use the health projection.
- Full and compact Gateway cron read views expose projected top-level `lastRunAtMs`, `lastRunStatus`, and `lastRunError` fields.
- Control UI status and activity-time helpers prefer those top-level fields and retain a state-based recovery fallback for compatible servers.
- Cron CLI list, show, and JSON status enrichment prefer the same top-level status and activity timestamp.
- Run history, retry backoff, and scheduler state transitions continue to use persisted run state.

Any future cron status surface must choose explicitly between historical run outcome and current health. Active-problem UI must use current health; diagnostics may show both.
