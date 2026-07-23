# Project Goal

- Repository: `openclaw/openclaw`, forked to `AlexbeatsZ/openclaw` and cloned locally at `C:\Users\Meta\Project\Workspaces\ai-agent\openclaw`.
- Current task: implement optional `main + direct` cron delivery so scheduled AI output can be captured by the program and forwarded to QQ without asking the model to call the message tool.
- Maintenance policy: this is now maintained as the user's own fork/project. Do not submit upstream PRs by default; push ongoing work to `origin` (`AlexbeatsZ/openclaw`) and use `upstream` only for fetching/syncing upstream changes.
- Current task: add an OpenClaw model provider for `agy` CLI so OpenClaw can forward prompts to `agy -p` and return the CLI output as assistant text, without reverse proxying or modifying agy's internal prompts.

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

## Fork maintenance policy

- `origin` is the authoritative project remote: `https://github.com/AlexbeatsZ/openclaw.git`.
- `upstream` is kept only for reading from the original project: `https://github.com/openclaw/openclaw.git`.
- Upstream pull requests are intentionally out of scope unless the user explicitly asks for one.
- To avoid accidental upstream pushes, local `upstream` push URL is set to `DISABLED`.

## Deployment policy

- The Windows local checkout at `C:\Users\Meta\Project\Workspaces\ai-agent\openclaw` is for code edits, tests, commits, and pushes only.
- The running OpenClaw instance lives on the user's server, reached as `meta@100.106.169.46`, with the actual build/deployment target inside that server's WSL environment. Runtime config changes, production builds, service restarts, and deployment verification must be performed on the server WSL instance, not by creating or changing local Windows `~/.openclaw` config.
- The server SSH entry defaults to Windows `cmd`/PowerShell, not Linux bash. For WSL work, explicitly enter WSL from remote PowerShell/cmd; do not assume `/home/meta` exists at the top-level SSH filesystem.
- Do not create local Windows OpenClaw runtime config as a substitute for server deployment. A mistaken local `C:\Users\Meta\.openclaw\openclaw.json` was created during agy default-model testing and then removed.
- Local Windows cleanup audit after the mistaken config creation found no local OpenClaw deployment: no `openclaw` command, no `C:\Users\Meta\.openclaw` or `.clawdbot`, no matching Windows service, no scheduled task, and no OpenClaw process. Temporary backup/probe artifacts from that mistaken local config attempt were also removed from `%LOCALAPPDATA%\Temp\.agents`.

## Model fallback changes from this task

- Embedded-agent fallback classification now treats terminal quota/rate-limit/business-denial errors as fallback-worthy even when partial visible output exists, as long as the run is still replay-safe.
- Fallback is still blocked after committed outbound delivery or unsafe side-effecting tool calls. A new guard allows replay after tool calls only when the result is explicitly marked `fallbackSafe`.
- Added coverage for partial visible output followed by `429` / `insufficient_quota` and for the side-effect guard that prevents unsafe replay.

## Agy CLI provider implementation

- `extensions/agy` registers provider id `agy` with default model ref `agy/default`.
- The provider uses synthetic local auth marker `agy-cli`; no API key is required because agy CLI owns its own login/session state.
- The model catalog declares `openai-completions` for schema compatibility, and the static agy model list contains only Gemini entries: `agy/gemini-3.5-flash` and `agy/gemini-3.1-pro`. Both carry `agentRuntime: { id: "agy" }` so normal agent runs use the generic CLI backend path rather than pretending agy is an HTTP API.
- `extensions/agy/cli-backend.ts` mirrors the Gemini CLI pattern by registering a `CliBackendPlugin`: command `agy`, args `--print-timeout 10m --print {prompt}`, text output, serialized execution, and `nativeToolMode: "always-on"`.
- Agy's CLI help exposes `--model` but no separate `--thinking` flag. OpenClaw therefore exposes thinking controls through the provider thinking profile and maps selected thinking levels to agy model-id variants before invoking `agy --model <variant>`.
- Agy has no native system-prompt flag. Core CLI runner config now supports `systemPromptTransport: "prompt-prefix"`, allowing CLI-backend system prompts to be prepended into the prompt text for CLIs without a system channel.
- Runtime invocation defaults to `agy --model gemini-3.5-flash --print-timeout 10m --print <prompt>` for the default model. `agy/gemini-3.1-pro` is mapped to `--model gemini-3.1-pro`, and selected thinking levels map to suffix variants such as `gemini-3.1-pro-high` or `gemini-3.5-flash-medium`.
- Agy image support is path-level, not native API multimodal transport: agy Gemini models are declared as `text+image`, OpenClaw stages images into the workspace `.openclaw-cli-images` directory, and the CLI backend appends `@<image-path>` to the prompt so agy can use its own native file/vision handling. Actual image understanding still depends on agy/model behavior.
- Plugin config supports `command`, `args`, `cwd`, `env`, `timeoutMs`, `maxOutputBytes`, `modelArg`, and `promptArg` under `plugins.entries.agy.config`.
- The fallback stream formatter now defaults to a filtered system prompt: it strips OpenClaw `## ...tool...` sections and adds a short note telling agy to use its native tools. This avoids both extremes: no prompt at all, or injecting OpenClaw tool-call syntax into agy.
- The active agy runtime path is the generic CLI backend, not `extensions/agy/stream.ts`. Keep the same system-prompt filtering wired through `CliBackendPlugin.transformSystemPrompt`; otherwise agy receives the full OpenClaw tool/skills/messaging prompt and the server run can exceed 60k prompt chars.
- Agy filtered system prompts are capped before transport. This keeps useful identity/safety/context guidance while stripping OpenClaw-specific tool-call, skill-list, messaging, and output-directive sections that agy cannot consume directly.
- Fallback stream config supports `systemPromptMode: "filtered" | "full" | "none"`. The old `includeSystemPrompt` remains as compatibility mapping (`true` -> `full`, `false` -> `none`).
- The prompt formatter flattens user/assistant history and tool results into plain text. Image parts are marked omitted because the CLI prompt mode is text-only here.
- The stream adapter strips ANSI output, estimates zero-cost usage locally, emits normal assistant `start` / `text_*` / `done` events, and returns CLI failures as provider stream errors.
- Do not add reverse proxy behavior or mutate agy's internal prompt/config for this provider; it is intentionally only a local CLI forwarding adapter.
- `agy --help` exposes no dedicated system-prompt file argument. Antigravity CLI documentation describes workspace `GEMINI.md` / `AGENTS.md` project instruction files, so an OpenClaw "write prompt to file" design for agy would be a workspace-instruction-file feature, not a native system-prompt transport. Do not silently overwrite user project instruction files; prefer prompt-prefix unless a scoped temp workspace or explicit user-controlled file path is designed.
- Agy must be bundled into the root OpenClaw dist for the server WSL service. `extensions/agy/package.json` must not set `openclaw.build.bundledDist: false`; otherwise `pnpm build` succeeds but `dist/extensions/agy` is absent and the configured agy provider cannot load.
- Server agy deployment imports only the two Gemini entries `agy/gemini-3.5-flash` and `agy/gemini-3.1-pro`. Do not bulk-import agy Claude/GPT model names unless the user explicitly asks.
- Server WSL agy auth diagnostic: `/home/meta/.gemini/antigravity-cli/antigravity-oauth-token` can exist and be unexpired while `agy --print` still emits "Authentication required" because print mode's silent auth waits only about 5 seconds for keyring/userinfo/code-assist. Logs show `keyringAuth: loaded token` followed by `keyringAuth: timed out after 5s` and OAuth fallback. Direct short prompts may succeed while OpenClaw runs fail if the cold-start/auth path is slow.
- Server WSL currently has `dbus-user-session` but not `gnome-keyring`/`libsecret`. Public Antigravity CLI WSL troubleshooting points to a persistent Secret Service/keyring backend for repeated-login failures; installing that is a global server change and requires explicit user approval first.
- OpenClaw gateway is a user systemd service and does not read the user's interactive `zsh` startup files. If agy works in an interactive shell but not through OpenClaw, compare proxy/keyring variables in `systemctl --user show openclaw-gateway.service -p Environment`; missing `HTTP_PROXY`/`HTTPS_PROXY`, `XDG_RUNTIME_DIR`, or `DBUS_SESSION_BUS_ADDRESS` can make agy auth fall back to OAuth even with a valid token.
- Follow-up diagnostic showed keyring was not required once proxy env was present: `agy` succeeded in an empty environment with proxy variables but without `DBUS_SESSION_BUS_ADDRESS`/`XDG_RUNTIME_DIR`. Gateway service now keeps only proxy env for agy network access; keyring-related env was removed from the service unit.
- Server WSL cron/default AI was switched to agy Gemini High: `/home/meta/.openclaw/openclaw.json` now has `agents.defaults.model.primary = "agy/gemini-3.5-flash"` and `agents.defaults.thinkingDefault = "high"`. The active scheduled jobs `Steped_Study_Check`, `Daily_Review_Feedback`, `Weekly_Academic_Audit`, and `Memory Dreaming Promotion` were also edited to explicit `model: agy/gemini-3.5-flash` and `thinking: high`, so old per-job DeepSeek/local Gemini overrides do not bypass the new default.

## Verification notes

- Passed after agy Gemini model fix: `pnpm exec tsc -p extensions/agy/tsconfig.json --noEmit`.
- Passed after agy Gemini model fix: `pnpm vitest run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts` (8 tests).
- Passed after agy Gemini model fix: `pnpm exec oxfmt --check extensions/agy/catalog.ts extensions/agy/cli-backend.ts extensions/agy/index.ts extensions/agy/index.test.ts extensions/agy/openclaw.plugin.json`.
- Passed after agy Gemini model fix: `pnpm tsgo:extensions`.
- Passed after agy CLI-backend prompt filtering fix: `pnpm vitest run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts` (10 tests).
- Passed after agy CLI-backend prompt filtering fix: `pnpm exec tsc -p extensions/agy/tsconfig.json --noEmit`.
- Passed after agy CLI-backend prompt filtering fix: `pnpm exec oxfmt --check extensions/agy/cli-backend.ts extensions/agy/stream.ts extensions/agy/index.test.ts`.
- Passed after agy CLI-backend prompt filtering fix: `pnpm tsgo:extensions`.
- Server WSL deployment of `1c90018f4f` rebuilt successfully and restarted `openclaw-gateway.service`; health returned `{"ok":true,"status":"live"}`.
- Post-deploy OpenClaw gateway agy smoke still returned agy OAuth text, but `systemPromptReport.systemPrompt.chars` dropped to `24130`, confirming the CLI-backend prompt filter is active. Remaining blocker is agy/keyring auth persistence in WSL, not provider registration or model selection.
- After installing `gnome-keyring`/`libsecret` and adding the interactive-shell proxy plus D-Bus/keyring environment to `/home/meta/.config/systemd/user/openclaw-gateway.service`, OpenClaw gateway agy smoke passed: payload `OPENCLAW_AGY_PROXY_OK`, provider `agy`, model `gemini-3.5-flash`, prompt chars `24130`.
- Server service-unit backup before proxy/keyring env change: `/home/meta/.openclaw/backups/openclaw-gateway-service-before-proxy-20260628-165900.service`.
- After removing DBus/keyring env from the gateway service unit while keeping proxy env, OpenClaw gateway agy smoke still passed: payload `OPENCLAW_AGY_NO_KEYRING_OK`. Backup before this service edit: `/home/meta/.openclaw/backups/openclaw-gateway-service-before-remove-keyring-env-20260628-170149.service`.
- Attempted to uninstall `gnome-keyring`/`gnome-keyring-pkcs11`, but server WSL required a sudo password, so packages remain installed. They are no longer referenced by OpenClaw's service environment.
- Server config backup before the agy cron/default High switch: `/home/meta/.openclaw/backups/agy-cron-default-high-before-20260628-170947.json`.
- Server WSL cron/default High verification passed: defaults showed primary `agy/gemini-3.5-flash` plus `thinkingDefault: high`; all four active cron jobs showed `model: agy/gemini-3.5-flash`, `thinking: high`, and `status: ok`; gateway health returned `{"ok":true,"status":"live"}` after service restart.
- OpenClaw gateway agy High smoke passed without direct delivery: `node dist/index.js agent --agent main --message 'Reply exactly: OPENCLAW_AGY_HIGH_OK' --model agy/gemini-3.5-flash --thinking high --timeout 180 --json` returned payload `OPENCLAW_AGY_HIGH_OK`, provider `agy`, runner `cli`. Agy logs confirmed the actual CLI model variant was `gemini-3.5-flash-high`.
- 2026-06-30 diagnosis for QQ message `你好，我无法给到相关内容。`: the visible text was not produced by agy. `Steped_Study_Check` first selected `agy/gemini-3.5-flash`, agy returned an empty response, OpenClaw fell back to `sensenova-openai/deepseek-v4-flash`, and Sensenova returned `Provider finish_reason: content_filter` with that Chinese fallback text. Direct agy logging showed silent auth can refresh successfully, then Gemini fails with `FAILED_PRECONDITION (code 400): User location is not supported for the API use.` Treat this as an agy/Gemini regional/API availability restriction or proxy egress issue, plus a secondary Sensenova content-filter fallback symptom.

## QQ Bot long text encoding fix

- Agy direct stdout and OpenClaw agy provider JSON preserve UTF-8 correctly for Chinese, Greek, check mark, and emoji smoke prompts. The observed QQ message corruption showed Unicode replacement characters (`�`), not ordinary question marks, which points to downstream UTF-8 byte-boundary damage rather than model output.
- QQ Bot direct/proactive text delivery previously sent long text as one message when it was under the 5000-character limit. Chinese text can be under that character limit but over QQ's effective byte-safe payload budget, causing the platform/client path to damage UTF-8 sequences.
- `extensions/qqbot/src/engine/messaging/markdown-table-chunking.ts` already had the right 3600 UTF-8 byte-safe Markdown chunking logic for some paths. The direct `sendText` path in `extensions/qqbot/src/engine/messaging/outbound.ts` now reuses that byte-safe chunker for normal text, text around media tags, and text sent after media.
- Regression test `extensions/qqbot/src/engine/messaging/outbound.test.ts` covers long Chinese proactive text: chunks join back to the original text, each chunk is <= 3600 UTF-8 bytes, and no chunk contains `\uFFFD`.
- 2026-06-30 follow-up diagnosis for short QQ text `需要���帮忙`: the message is too short to hit QQ payload splitting. The root cause was the generic CLI supervisor's output decoder on Linux/WSL decoding each stdout `Buffer` with `toString("utf8")`; when agy split a Chinese UTF-8 character across child-process data events, OpenClaw inserted replacement characters before QQ delivery. `src/infra/windows-encoding.ts` now uses streaming UTF-8 decoding on every platform, while retaining the Windows legacy-codepage fallback path. The fallback `extensions/agy/stream.ts` runner was also changed to streaming UTF-8 decoding.
- Passed after agy bundled-dist fix: `pnpm vitest run test/scripts/bundled-plugin-build-entries.test.ts src/infra/tsdown-config.test.ts` (2 files, 34 tests).
- Passed after agy bundled-dist fix: `pnpm exec tsc -p extensions/agy/tsconfig.json --noEmit`.
- Passed after agy bundled-dist fix: direct build-entry query confirmed `dist/extensions/agy/catalog.js`, `cli-backend.js`, `index.js`, `openclaw.plugin.json`, `package.json`, and `stream.js` are required package artifacts.
- Passed after agy bundled-dist fix: `pnpm vitest run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts` (7 tests).
- Passed after agy bundled-dist fix: `pnpm exec oxfmt --check extensions/agy/package.json test/scripts/bundled-plugin-build-entries.test.ts`.
- Passed after QQ Bot UTF-8 chunking fix: `pnpm exec tsc -p extensions/qqbot/tsconfig.json --noEmit`.
- Passed after QQ Bot UTF-8 chunking fix: `pnpm vitest run --config test/vitest/vitest.extension-messaging.config.ts qqbot/src/engine/messaging/outbound.test.ts qqbot/src/engine/messaging/markdown-table-chunking.test.ts qqbot/src/channel.message-adapter.test.ts` (3 files, 25 tests).
- Passed after QQ Bot UTF-8 chunking fix: `pnpm tsgo:extensions`.
- Passed after QQ Bot UTF-8 chunking fix: `pnpm exec oxfmt --check extensions/qqbot/src/engine/messaging/markdown-table-chunking.ts extensions/qqbot/src/engine/messaging/outbound.ts extensions/qqbot/src/engine/messaging/outbound.test.ts`.
- Passed after CLI UTF-8 streaming decoder fix: `pnpm vitest run src/infra/windows-encoding.test.ts` (10 tests).
- Passed after CLI UTF-8 streaming decoder fix: direct `pnpm exec tsx -e` smoke splitting the UTF-8 bytes for `我` in `需要我帮忙`, confirming no `\uFFFD`.
- Passed after CLI UTF-8 streaming decoder fix: `pnpm vitest run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts` (10 tests).
- Passed after CLI UTF-8 streaming decoder fix: `pnpm exec tsc -p extensions/agy/tsconfig.json --noEmit`.
- Passed after CLI UTF-8 streaming decoder fix: `pnpm tsgo:core`.
- Passed after CLI UTF-8 streaming decoder fix: `pnpm tsgo:extensions`.
- Passed after CLI UTF-8 streaming decoder fix: `pnpm exec oxfmt --check src/infra/windows-encoding.ts src/infra/windows-encoding.test.ts extensions/agy/stream.ts`.
- Server WSL deployment of CLI UTF-8 streaming decoder fix fast-forwarded `/home/meta/Project/Workspaces/openclaw` to `84cbbc3445`, rebuilt with `corepack pnpm build`, restarted `openclaw-gateway.service`, and verified remote HEAD `84cbbc3445`, service `active`, QQBot connected, and health `{"ok":true,"status":"live"}` on `127.0.0.1:18789`.
- Server WSL deployment of QQ Bot UTF-8 chunking fix fast-forwarded `/home/meta/Project/Workspaces/openclaw` to `9f848f77b4`, rebuilt with `corepack pnpm build`, restarted `openclaw-gateway.service`, and verified health `ok`, service `active`, QQBot connected, and plugin errors empty.
- Server WSL pnpm prerequisite is now installed correctly via Corepack at `/home/meta/.local/bin/pnpm` (`pnpm --version` = `11.2.2`). The temporary `/tmp/openclaw-pnpm-shim` workaround was removed and must not be recreated.
- Server WSL deployment attempt before the bundled-dist fix fast-forwarded the repo and rebuilt successfully, but `dist/extensions/agy` was absent because `extensions/agy` was marked `bundledDist: false`. Treat that deployment as incomplete until the bundled-dist fix is pulled, rebuilt, verified, and the service restarted.
- Server WSL deployment of `3f47f70971` rebuilt successfully with real pnpm, verified `dist/extensions/agy/openclaw.plugin.json` contains `Gemini 3.5 Flash`, updated `/home/meta/.openclaw/openclaw.json` so `agents.defaults.model.primary` is `agy/gemini-3.5-flash`, and kept only `gemini-3.5-flash` plus `gemini-3.1-pro` in `models.providers.agy.models`.
- Server config backup before the Gemini model correction was written under `/home/meta/.openclaw/backups/agy-gemini-models-before-*.json`.
- Server gateway was restarted after the agy Gemini model correction; health recovered to `200 {"ok":true,"status":"live"}` and logs showed `gateway ready`.
- Passed for agy provider: `.\node_modules\.bin\tsc.cmd -p extensions\agy\tsconfig.json --noEmit`.
- Passed after CLI backend/prompt update: `pnpm build:plugin-sdk:dts` and `node --experimental-strip-types scripts/write-plugin-sdk-entry-dts.ts`.
- Passed after CLI backend/prompt update: `pnpm tsgo:core`.
- Passed after CLI backend/prompt update: `pnpm tsgo:extensions`.
- Passed after CLI backend/prompt update: `node scripts/run-vitest.mjs run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts` (7 tests).
- Passed after CLI backend/prompt update: `node scripts/run-vitest.mjs run --config test/vitest/vitest.agents.config.ts src/agents/cli-runner.helpers.test.ts` (27 tests).
- Passed after CLI backend/prompt update: modified-file `oxfmt --check`.
- Passed after agy image-path support: `node scripts/run-vitest.mjs run --config test/vitest/vitest.extensions.config.ts extensions/agy/index.test.ts`.
- Passed after agy image-path support: `.\node_modules\.bin\tsc.cmd -p extensions\agy\tsconfig.json --noEmit`.
- Passed after agy image-path support: `pnpm tsgo:extensions`.
- Passed after agy image-path support: `pnpm exec oxfmt --check extensions/agy/cli-backend.ts extensions/agy/catalog.ts extensions/agy/index.test.ts extensions/agy/openclaw.plugin.json`.
- Mistaken local Windows default config creation was reverted: `C:\Users\Meta\.openclaw\openclaw.json` was deleted. Agy default-model deployment still needs to be applied on the server WSL runtime config/build target.
- Passed local cleanup verification after mistaken config creation: `C:\Users\Meta\.openclaw` absent, `C:\Users\Meta\.clawdbot` absent, `openclaw` command absent, no OpenClaw Windows service, no OpenClaw scheduled task, and no OpenClaw process.
- Live agy smoke: `agy -p "Reply exactly: AGY_OK"` and `agy --print-timeout 1m --print "Reply exactly: AGY_OK"` exited 0 and logs showed silent auth, conversation creation, and `streamGenerateContent`, but stdout was empty on this host. This appears to be agy print-mode capture behavior rather than OpenClaw argument construction.
- Attempted after lockfile cleanup: `pnpm install --frozen-lockfile --ignore-scripts` timed out after 3 minutes with no diagnostic output.
- Passed for agy provider: lightweight `tsx` stream smoke using a fake runner, confirming ANSI-stripped stdout returns `start`, `text_start`, `text_delta`, `text_end`, `done`.
- Attempted for agy provider: `.\node_modules\.bin\vitest.cmd run extensions\agy\index.test.ts`, but it stayed in Rolldown/Vitest build plugin timing output for over two minutes and was stopped. The test file remains added for normal CI/local Vitest runs.
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
- Server WSL deployment of direct-cron transcript fix fast-forwarded `/home/meta/Project/Workspaces/openclaw` to `37db64e148041ab083b150a6e4c3f73aeb36ab12`, rebuilt with `corepack pnpm build`, and restarted `openclaw-gateway.service`.
- Server backup for the transcript fix was written to `C:\Users\Meta\AppData\Local\Temp\.agents\openclaw-transcript-fix-20260626-193755`.
- Post-deploy server health returned `ok` and event-loop health normalized after startup. QQ Bot reported configured; a live cron run was not forced while connection status was not confirmed, to avoid creating an expected direct-delivery failure record.
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
- Private QA builds must emit the complete runtime import surface together: `qa-lab`, `qa-runtime`, `qa-channel`, and `qa-channel-protocol`. Emitting only the first two leaves `extensions/qa-lab/src/runtime-api.ts` unable to resolve `openclaw/plugin-sdk/qa-channel` during a cold gateway start.

# Task Board

- [x] Investigate OpenClaw system prompt structure and write study notes to `docs/research/openclaw-system-prompt.md`.
- [x] Confirm local GitHub authentication.
- [x] Fork `openclaw/openclaw` to the logged-in GitHub account.
- [x] Move fork checkout to `C:\Users\Meta\Project\Workspaces\ai-agent\openclaw`.
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
- [x] Switch project handling policy to maintain the user's fork directly and disable accidental upstream pushes.
- [x] Add `agy` CLI-backed model provider extension.
- [x] Verify `agy` provider TypeScript build and stream smoke behavior.
- [x] Rework `agy` provider to mimic Gemini CLI backend/runtime binding and filtered prompt handling.
- [x] Install real pnpm in server WSL and remove the temporary pnpm shim.
- [x] Fix agy bundled-dist packaging so `dist/extensions/agy` is emitted by the root build.
- [x] Redeploy agy bundled-dist/Gemini model fix to server WSL, rebuild, restart gateway, and verify `dist/extensions/agy` exists.
- [x] Set server WSL OpenClaw default and all active cron jobs to agy `gemini-3.5-flash` with High thinking.
- [x] Diagnose QQ received-message `�` corruption after agy output; cause is long QQ text delivery not byte-safe, not agy stdout.
- [x] Fix QQ Bot direct/proactive text delivery to split long output by UTF-8 byte budget before sending.
- [x] Diagnose follow-up short QQ `�` corruption; cause was Linux/WSL CLI stdout chunks being decoded without a streaming UTF-8 decoder.
- [x] Fix generic CLI supervisor and agy fallback runner to preserve UTF-8 characters split across process data events.
- [x] Diagnose 2026-06-30 `你好，我无法给到相关内容。`: agy failed on Gemini regional/API availability (`User location is not supported`), then fallback Sensenova content-filtered the cron output.
- [x] Reproduce the `qa-lab` cold-start load failure and trace it to missing private QA SDK build entries.
- [x] Add the missing `qa-channel` and `qa-channel-protocol` private build entries with a focused regression test.
- [ ] Deploy the private QA build fix, enable the private QA runtime alias, and verify a clean cold gateway start.
