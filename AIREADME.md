# Project Goal

- Repository: `openclaw/openclaw`, forked to `AlexbeatsZ/openclaw` and cloned locally at `C:\Users\Meta\Project\Workspaces\openclaw`.
- Current task: implement optional `main + direct` cron delivery so scheduled AI output can be captured by the program and forwarded to QQ without asking the model to call the message tool.

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

## Main direct cron delivery implementation

- `delivery.strategy` now supports `heartbeat` and `direct`; omitted strategy keeps the existing `heartbeat` behavior.
- `main + heartbeat` remains constrained to the old main-session heartbeat/system-event path. `main + direct` allows `systemEvent` or `agentTurn`, but requires explicit `delivery.channel` and `delivery.to` so cron cannot accidentally target the most recent conversation.
- Direct delivery still runs the model once in the main heartbeat/session chain. The runner captures all user-visible assistant payloads, filters out reasoning/tool/system/internal-error payloads, and sends the visible payload batch directly through the configured channel target.
- Direct delivery does not call a second model and does not require the model to use the `message` tool. QQ/plugin-specific cleanup and splitting remain in the durable outbound send path.
- Direct cron bypasses only its own active-cron marker. Other active cron jobs still block execution, preserving the existing concurrency guard.
- Direct cron must also ignore the current cron command lane occupancy. Manual and scheduled cron executions run inside `CommandLane.Cron`, so checking the raw cron lane size makes the current job block its own heartbeat until timeout with `cron-in-progress`.
- Cron results now propagate `deliveryAttempted`, `delivered`, delivery target/error details, provider/model, and `fallbackUsed` back into run logs. Direct delivery succeeds only when the full payload batch is sent.
- UI cron configuration now exposes delivery strategy as "Session delivery" and "Program delivery" for main-session jobs. Program delivery hides best-effort mode and validates explicit channel/target.
- State/protocol/tool schemas persist and expose `delivery_strategy`, and all shipped UI locales were synced with English fallback strings for the new controls.
- Direct cron must keep heartbeat execution semantics for event suppression and queue behavior, but its transcript prompt must persist the real scheduled task body. If it uses the generic heartbeat transcript marker, daily task records show `[OpenClaw heartbeat poll]` / empty HEARTBEAT-like prompts even though the persisted cron payload is intact.

## Model fallback changes from this task

- Embedded-agent fallback classification now treats terminal quota/rate-limit/business-denial errors as fallback-worthy even when partial visible output exists, as long as the run is still replay-safe.
- Fallback is still blocked after committed outbound delivery or unsafe side-effecting tool calls. A new guard allows replay after tool calls only when the result is explicitly marked `fallbackSafe`.
- Added coverage for partial visible output followed by `429` / `insufficient_quota` and for the side-effect guard that prevents unsafe replay.

## Verification notes

- Passed: `pnpm tsgo:core`.
- Passed: targeted Vitest backend set covering direct runner, cron service, fallback classifier, protocol/schema, state DB, and cron tool schema: 16 files, 607 tests passed, 2 skipped.
- Passed: targeted Vitest UI/i18n set: 5 files, 71 tests passed, 2 skipped.
- Passed: `pnpm ui:i18n:check`.
- Passed: `pnpm db:kysely:check`.
- Passed: local changed-file formatting check with `oxfmt --check` on the modified files.
- Passed: `pnpm build` after final formatting.
- Passed after deployment-gate fix: `pnpm vitest run src/infra/heartbeat-runner.skips-busy-session-lane.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts` (2 files, 23 tests).
- Passed after deployment-gate fix: `pnpm tsgo:core`.
- Passed after direct-cron transcript fix: `pnpm vitest run src/auto-reply/reply/prompt-prelude.test.ts src/infra/heartbeat-runner.returns-default-unset.test.ts` (2 files, 53 tests).
- Passed after direct-cron transcript fix: `pnpm tsgo:core`.
- Passed after direct-cron transcript fix: modified-file `oxfmt --check`.
- Passed after direct-cron transcript fix: `pnpm build`.
- `pnpm test:changed` failed outside this change in `packages/memory-host-sdk/src/host/session-files.test.ts` because Windows path casing differed in expected transcript paths and teardown hit `EPERM` on its temp directory.
- Default `pnpm check:changed` delegates to Blacksmith/Crabbox and reported a crabbox binary sanity-check failure. The local remote-child form reached `prompt snapshot drift` and failed with `spawn EINVAL` in `scripts/generate-prompt-snapshots.ts:49`, matching a Windows local environment issue.
- Full-repo `pnpm format:check` reported many pre-existing formatting issues outside this task; only modified files were formatted and rechecked.
- Server backup was written under `C:\Users\Meta\AppData\Local\Temp\.agents\openclaw-direct-delivery-20260625-121452` before deployment.
- Server WSL deployment switched the user systemd `openclaw-gateway.service` from the old global package entrypoint to `/home/meta/Project/Workspaces/openclaw/dist/index.js` without upgrading the global package.
- Server cron migration changed `Steped_Study_Check`, `Daily_Review_Feedback`, and `Weekly_Academic_Audit` to `sessionTarget: "main"` with `delivery.strategy: "direct"`. `Memory Dreaming Promotion` stayed isolated with `delivery.mode: "none"` because it is an internal memory-core promotion job.
- First server validation of `Steped_Study_Check` failed with `cron-in-progress`, confirming the direct runner still treated its own cron lane occupancy as blocking. The local fix now skips cron lane-size admission only for direct cron while preserving the other-active-cron marker guard.
- After redeploying the lane-admission fix, `Steped_Study_Check` reached model execution but failed because the server still had legacy `auth-profiles.json` credentials while the current runtime reads `openclaw-agent.sqlite`.
- Migrated the existing main-agent legacy auth profiles into SQLite using OpenClaw's own auth store helpers, after backing up the prior SQLite/auth files under `C:\Users\Meta\AppData\Local\Temp\.agents\openclaw-auth-before-sqlite-import-20260625-125416`.
- After auth migration, `models status` showed no missing auth for configured providers. Re-running `Steped_Study_Check` succeeded with fallback to `sensenova-openai/deepseek-v4-flash`, `delivered=true`, and `lastDeliveryStatus=delivered`.
- Final server health was `ok`; QQ bot was running and connected. `Daily_Review_Feedback` still has historical `consecutiveErrors=15`, but its delivery config is now `main + direct` and the shared model auth issue has been fixed for future runs.

# Task Board

- [x] Confirm local GitHub authentication.
- [x] Fork `openclaw/openclaw` to the logged-in GitHub account.
- [x] Clone fork to `C:\Users\Meta\Project\Workspaces\openclaw`.
- [x] Add `upstream` remote pointing at `https://github.com/openclaw/openclaw.git`.
- [x] Analyze scheduled task / cron code.
- [x] Analyze model fallback code.
- [x] Record findings in `AIREADME.md`.
- [x] Commit and push this analysis file to the fork.
- [x] Implement optional `main + direct` cron delivery strategy.
- [x] Add direct delivery UI controls and validation.
- [x] Persist/normalize/protocol-expose `delivery.strategy`.
- [x] Propagate direct delivery status and fallback telemetry into cron run logs.
- [x] Improve replay-safe quota/rate-limit fallback classification.
- [x] Add targeted tests for direct delivery and fallback behavior.
- [x] Run targeted tests, typecheck, i18n check, Kysely check, local changed-file format check, and full build.
- [ ] Resolve or bypass unrelated Windows-local `test:changed` memory-host path casing failure.
- [ ] Resolve local `check:changed` prompt snapshot `spawn EINVAL` / crabbox sanity issue.
- [x] Confirm before server backup/deploy and before any global package upgrade.
- [x] Deploy to server WSL without upgrading the global package.
- [x] Migrate `Steped_Study_Check`, `Daily_Review_Feedback`, and `Weekly_Academic_Audit` to `main + direct`; keep Memory Dreaming isolated.
- [x] Redeploy the direct cron lane-admission fix and re-run `Steped_Study_Check` validation.
- [x] Import legacy main-agent auth profiles into SQLite so direct main cron can resolve model credentials.
- [x] Diagnose and fix direct cron records showing heartbeat/HEARTBEAT placeholders instead of the scheduled task body.
