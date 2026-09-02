# Cron Trigger Health Projection

## Problem

A cron trigger can evaluate successfully without firing its payload. That quiet
success updates the trigger evaluation timestamp and resets consecutive errors,
but it intentionally leaves the historical run result intact. Presenting the
raw historical status after recovery makes a healthy trigger remain red.

## Ownership

Persisted job state remains the source of truth for historical runs. Scheduler,
retry, and backoff logic must continue to use the persisted run status.

`resolveJobHealthState` owns the current user-facing projection. It reports a
recovered trigger as healthy only when all of these conditions hold:

- the job has a trigger;
- the persisted run status is `error`;
- `consecutiveErrors` is zero; and
- `lastTriggerEvalAtMs` is newer than `lastRunAtMs`.

For a recovered trigger, the projection returns `ok`, uses the trigger
evaluation timestamp, and omits the stale error. It does not mutate storage.

## Consumer Contract

- List filtering and failure counts use current projected health.
- Full and compact gateway projections expose top-level projected status, time,
  and error fields while retaining nested persisted state.
- The Control UI and CLI prefer those top-level fields.
- The Control UI may derive the same projection from nested state for backward
  compatibility with older gateway responses.
- Run history, scheduler decisions, retry, and backoff continue to use persisted
  state rather than projected health.
