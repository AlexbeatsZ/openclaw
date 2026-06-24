# Project Goal

- Repository: `openclaw/openclaw`, forked to `AlexbeatsZ/openclaw` and cloned locally at `C:\Users\Meta\Project\Workspaces\openclaw`.
- Current task: study OpenClaw's scheduled task implementation and model fallback logic, then record the analysis here.

# Lessons Learned

## Cron / scheduled task implementation

- Public surface: `src/cron/service.ts` exposes `CronService`, a thin facade over locked operation helpers in `src/cron/service/ops.ts`. Main methods are `start`, `stop`, `status`, `list`, `add`, `update`, `remove`, `run`, and `enqueueRun`.
- Persisted job shape: `src/cron/types.ts` defines three schedule forms: `at`, `every`, and `cron`. Agent-turn cron payloads can specify `payload.model` and per-job `payload.fallbacks`, where `fallbacks` overrides agent/global fallback config when present.
- Schedule math: `src/cron/schedule.ts` computes next/previous timestamps. `cron` expressions use `croner` with an LRU-like cache capped at 512 entries. Timezone defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`. There is a defensive retry path for a Croner past-time/year-rollback issue, including Asia/Shanghai cases.
- Job-level schedule semantics: `src/cron/service/jobs.ts` wraps raw schedule math. `every` prefers `lastRunAtMs + everyMs`, otherwise uses an anchor; `at` one-shot jobs remain due until they complete successfully; `cron` supports deterministic staggering and retries the next second if initial computation is undefined.
- Scheduler loop: `src/cron/service/timer.ts` owns the single timer. `armTimer` clears any previous timeout, skips when stopped/disabled/restart-recovery-pending, clamps wakes to a max interval, and floors zero-delay wakes to avoid hot loops. `onTimer` reloads state, reserves due jobs by persisting `runningAtMs`, executes outside the lock, writes results, and rearms.
- Concurrency model: mutation/read repair paths use `locked(state, ...)`; long job execution intentionally happens outside the lock. A job with `state.runningAtMs` is not due, and active markers protect restart/cancel races.
- Execution modes: main-session jobs enqueue `systemEvent` text and request/trigger heartbeat. Detached jobs execute either `command` via `runCommandJob` or `agentTurn` via `runIsolatedAgentJob`.
- Timeout/watchdog: `executeJobCoreWithTimeout` creates an `AbortController`, registers active task cancellation for detached jobs, and uses agent setup/execution watchdog phases so cold setup failures get clearer timeout reasons.
- Result writeback: `applyJobResult` clears `runningAtMs`, records last status/error/diagnostics/duration/delivery state, classifies `lastErrorReason`, increments `consecutiveErrors` on error, tracks skipped separately, emits failure alerts, and computes the next run or deletion policy.
- Retry/backoff: failed cron jobs use `resolveJobErrorBackoffUntilMs`, based on `lastRunAtMs + lastDurationMs + errorBackoffMs(consecutiveErrors)`. `recomputeJobNextRunAtMs` floors the next run at the backoff timestamp for non-`at` schedules.
- Schedule error isolation: invalid schedule computation increments `scheduleErrorCount`, clears `nextRunAtMs`, records `lastError`, and auto-disables after 3 consecutive schedule errors while notifying the user through a cron system event and heartbeat request.
- Startup recovery: `ops.start` loads persisted state, marks leftover `runningAtMs` jobs as interrupted failures, runs or defers missed jobs, and then arms the timer. Startup catch-up limits immediate jobs and defers agent-turn jobs to avoid blocking gateway/channel startup.

Important source anchors:

- `src/cron/schedule.ts:54` computes `at` / `every` / `cron` next timestamps.
- `src/cron/service/jobs.ts:67` defines retry backoff selection.
- `src/cron/service/jobs.ts:424` computes job-level next run.
- `src/cron/service/jobs.ts:482` records schedule compute failures and auto-disables after repeated errors.
- `src/cron/service/jobs.ts:670` performs maintenance-only recomputation without silently advancing due jobs.
- `src/cron/service/timer.ts:162` executes a job core with timeout/watchdog handling.
- `src/cron/service/timer.ts:653` applies outcome state and next-run/backoff logic.
- `src/cron/service/timer.ts:1062` arms the scheduler timer.
- `src/cron/service/timer.ts:1143` handles a timer tick.
- `src/cron/service/timer.ts:1526` collects runnable jobs.

## Model fallback logic

- Main entry: `src/agents/model-fallback.ts` exports `runWithModelFallback`. It builds an ordered model candidate chain, tries candidates in order, records structured attempts, emits optional decision events, and returns the first successful result.
- Candidate chain: candidates come from the requested provider/model plus configured fallbacks. Explicit override arrays are authoritative; an explicit empty fallback override disables fallback.
- Cron-specific model selection: `src/cron/isolated-agent/model-selection.ts` resolves isolated cron model precedence as default -> subagent/agent config -> Gmail hook model -> explicit cron `payload.model` -> stored session override. Explicit cron payload model rejection is returned as an error instead of silently falling back.
- Cron-specific fallback config: `src/cron/types.ts` allows `payload.fallbacks?: string[]`; `src/cron/isolated-agent/run/fallbacks.ts` treats `modelFallbacksOverride !== undefined` as authoritative, so an empty array disables default fallbacks for that run.
- Attempt behavior: `runFallbackAttempt` wraps each provider/model run. Returned results may still be classified as fallback-worthy through `classifyResult`; this is how malformed/invisible embedded-agent outputs can trigger the next candidate without needing a thrown provider error.
- Error normalization: candidate errors are coerced into `FailoverError` when possible, carrying reason/status/code/provider/model/session/lane. Non-provider runtime coordination failures and terminal aborts are rethrown, not consumed by fallback.
- Context overflow policy: likely context-overflow errors are explicitly rethrown so the inner runner's compaction/retry logic handles them; fallback does not switch models for these because another model may have a smaller context window.
- Cooldown/auth policy: when all auth profiles for a provider are in cooldown, the fallback loop can skip, probe, or suspend lanes depending on `resolveCooldownDecision`. It only suspends a lane immediately when no remaining candidate can serve as fallback.
- Session skip cache: `src/agents/fallback-skip-cache.ts` can skip non-primary candidates that recently failed with `auth` / `auth_permanent`, controlled by `OPENCLAW_FALLBACK_SKIP_TTL_MS`. Default TTL is 0, so this optimization is off unless configured.
- Live model switching: `LiveSessionModelSwitchError` during fallback may redirect directly to a later candidate already selected by the live session. Stale same/earlier targets are recorded as failed attempts instead of causing a loop.
- Exhaustion behavior: if multiple attempts fail, `throwFallbackFailureSummary` throws `FallbackSummaryError`, preserving attempts and soonest cooldown expiry, and suspends the session lane with `circuit_open`.
- Embedded-agent result classifier: `src/agents/embedded-agent-runner/result-fallback-classifier.ts` only flags failed invisible outputs or exact generic external-runner failure copy. Delivered messages, deliberate silent replies, hook blocks, aborts, and visible payloads do not trigger model fallback.
- Exhausted-result preservation: fallback-safe incomplete embedded results can be preserved on exhaustion, so the final response can keep the best trusted terminal payload while normalizing the execution trace.

Important source anchors:

- `src/agents/model-fallback.ts:1333` is the public `runWithModelFallback` entry.
- `src/agents/model-fallback.ts:1355` resolves the candidate chain.
- `src/agents/model-fallback.ts:1421` skips known-bad non-primary candidates from the session cache.
- `src/agents/model-fallback.ts:1475` handles auth-profile cooldown decisions.
- `src/agents/model-fallback.ts:1730` rethrows context overflow instead of model-switching.
- `src/agents/model-fallback.ts:1749` handles live-session model-switch redirects.
- `src/agents/model-fallback.ts:1801` marks auth/auth_permanent fallback candidates as skippable for later turns.
- `src/agents/model-fallback.ts:661` builds the final `FallbackSummaryError`.
- `src/agents/fallback-skip-cache.ts:139` records a skip marker.
- `src/agents/fallback-skip-cache.ts:171` checks an unexpired skip marker.
- `src/agents/embedded-agent-runner/result-fallback-classifier.ts:170` classifies embedded-agent terminal results for fallback.
- `src/cron/isolated-agent/model-selection.ts:69` resolves cron isolated-agent model precedence.

# Task Board

- [x] Confirm local GitHub authentication.
- [x] Fork `openclaw/openclaw` to the logged-in GitHub account.
- [x] Clone fork to `C:\Users\Meta\Project\Workspaces\openclaw`.
- [x] Add `upstream` remote pointing at `https://github.com/openclaw/openclaw.git`.
- [x] Analyze scheduled task / cron code.
- [x] Analyze model fallback code.
- [x] Record findings in `AIREADME.md`.
- [x] Commit and push this analysis file to the fork.
