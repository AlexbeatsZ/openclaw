# AGENTS.MD

Telegraph style. Root rules only. Read scoped `AGENTS.md` before subtree work.
Skills own workflows; root owns hard policy and routing.

## Start

- Repo: `https://github.com/openclaw/openclaw`
- Replies: repo-root refs only: `extensions/telegram/src/index.ts:80`. No absolute paths, no `~/`.
- Docs/user-visible work: `pnpm docs:list`, then read relevant docs only.
- Existing-solutions preflight: before proposing or building a custom system, feature, workflow, tool, integration, or automation, do a lightweight check for open-source projects, maintained libraries, existing OpenClaw plugins, or free platforms that already solve it well enough. Prefer those when adequate. Build custom only when existing options are unsuitable, too expensive, unmaintained, unsafe, non-compliant, or the user explicitly asks for custom. Avoid paid-service recommendations unless the user explicitly approves spend. Keep this to a brief preflight gate, not a broad research assignment.
- Fix/triage answers need source, tests, current/shipped behavior, and dependency contract proof.
- Reviews/answers: high confidence required. Default to exhaustive relevant codebase search/read, including owners, callers, siblings, tests, docs, and upstream/dependency contracts before verdict. Diff-only review is insufficient.
- Review default: read the whole changed function/module plus callers, callees, sibling implementations, adjacent tests, scoped docs, and dependency/Codex contracts before saying `good`, `bad`, `best fix`, `proof sufficient`, or posting a comment. If challenged, keep reading first; do not defend the earlier verdict until the missing path is checked.
- Dependency-touching work: direct dependency inspection is mandatory when feasible; do not rely on assumptions, wrappers, or memory. Most dependencies are OSS, so read their source/docs/types. Codex-related work has a hard gate: the acting agent must personally inspect sibling `../codex` source for the exact protocol/runtime behavior before any verdict, comment, approval, merge recommendation, code change, or `proof sufficient` claim. If missing, clone `https://github.com/openai/codex.git` there first. Subagent reports, PR text, OpenClaw wrappers, generated schemas, memory, and prior bot reviews do not satisfy this gate. No direct `../codex` check means no Codex verdict. Cite Codex files/lines checked in final/review/comment.
- Dependency-backed behavior: read upstream docs/source/types first. No API/default/error/timing guesses.
- External API work: live test required. Google/search for additional proof. Prefer official docs/source/types; cite current proof. No memory-only API claims.
- Live-verify when feasible. Never print secrets.
- Missing deps: `pnpm install`, retry once, then report first actionable error.
- CODEOWNERS: maint/refactor/tests ok. Larger behavior/product/security/ownership: owner ask/review.
- Product/docs/UI/changelog wording: "plugin/plugins"; `extensions/` is internal.
- New channel/plugin/app/doc surface: update `.github/labeler.yml` + GH labels.
- New `AGENTS.md`: add sibling `CLAUDE.md` symlink; edit `AGENTS.md` only.

## ClawSweeper Review Policy

- OpenClaw-specific review rules live here; generic ClawSweeper prompts stay repo-agnostic.
- ClawSweeper-owned schema, labels, close reasons, protected-label gates, maintainer-item gates, and mutation rules live in `openclaw/clawsweeper`.
- Review workers read this full root `AGENTS.md` before judging; no reliance on search snippets, `head`, partial ranges, local excerpts, or truncated copies. Then read every scoped `AGENTS.md` that owns touched paths.
- Optional integrations, providers, channels, skill bundles, MCP surfaces, and service workflows route to plugins, ClawHub, or owner repos when current seams suffice. Keep core items for missing core/plugin APIs, bundled regressions, security/core hardening, or maintainer product decisions.
- Plugin APIs, provider routing, auth/session state, persisted preferences, config loading, config/default additions, migrations, setup, startup checks, and fallback behavior are compatibility/upgrade-sensitive. Treat config breaks, new config/default surfaces, removed fallbacks, fail-closed changes, stricter validation, or new operator action as merge risk even with green CI when they can affect existing users, upgrades, provider/plugin behavior, or maintainer operations.
- For PRs that add, remove, or change config/default surfaces with possible compatibility, upgrade, provider/plugin, operator, setup, startup, or fallback impact, ClawSweeper review should emit a `reviewMetrics` entry when practical. The metric should name the count and direction of the changes, such as added, changed, or removed config/default surfaces, and explain why the metric matters before merge. When the metric indicates concrete merge risk, also surface the concern in `risks`, use `mergeRiskLabels` when the risk matches the label rubric, make `bestSolution` name the desired pre-merge state, and ensure `labelJustifications` explain the specific reason rather than restating the label.
- Review whole decision surfaces, not only the touched runtime, provider, channel, harness, plugin seam, or context path. Check sibling Codex/Pi-style runtimes, provider/model routing, channel delivery, gateway/protocol, plugin SDK, and context-management paths when relevant.
- Every PR review must explicitly ask whether the PR is the best fix, not merely a plausible fix. Verdicts need a best-fix judgment backed by enough code reading to compare owner boundaries, callers, siblings, tests, docs, current `main`, shipped behavior when relevant, and dependency/Codex contracts when involved.
- Before a PR verdict, build a small evidence map: changed surface, entry point, owner boundary, at least one caller and callee, sibling surfaces that share the invariant, existing tests, and current `main` behavior. If any cell is missing, say the gap instead of concluding.
- One-sided fixes need sibling-surface proof, an explanation for why siblings are unaffected, or explicit follow-up work.
- Changelog findings: see Docs / Changelog.
- Public ClawSweeper comments prefer `https://docs.openclaw.ai/...` when a public docs page exists; structured evidence still cites repo files, lines, SHAs.
- Findings need current source, shipped/current behavior, tests/CI evidence, and dependency contract proof when dependency-backed behavior is involved. Validation is judged against touched and sibling surfaces plus this file's commands; clear evidence matters for user-visible changes, with Telegram/Desktop proof for Telegram-visible behavior when feasible.
- Prefer findings for concrete behavior regressions, missing changed-surface proof, owner-boundary violations, security/API contract issues, or docs/config mismatches.
- Do not file findings for repo policy preference when changed code follows the relevant scoped guide and no user-visible, runtime, security, or maintainer-risk impact is shown.

## Map

- Core TS: `src/`, `ui/`, `packages/`; plugins: `extensions/`; SDK: `src/plugin-sdk/*`; channels: `src/channels/*`; loader: `src/plugins/*`; protocol: `packages/gateway-protocol/*`; docs/apps: `docs/`, `apps/`.
- Installers: sibling `../openclaw.ai`.
- Scoped guides: `extensions/`, `src/{plugin-sdk,channels,plugins,gateway,agents}/`, `packages/`, `test/helpers*/`, `docs/`, `ui/`, `scripts/`.

## Docs

- Source docs: `docs/**`; publish repo: `openclaw/docs`; host: `https://docs.openclaw.ai`.
- Flow: source -> `docs-sync-publish.yml` -> mirror build -> R2 -> Worker router.
- Docs AI: `openclaw/ask-molty`; see its `AGENTS.md`.

## Architecture

- Core stays plugin-agnostic. No bundled ids/defaults/policy in core when manifest/registry/capability contracts work.
- Plugins cross into core only via `openclaw/plugin-sdk/*`, manifest metadata, injected runtime helpers, documented barrels (`api.ts`, `runtime-api.ts`).
- Plugin prod code: no core `src/**`, `src/plugin-sdk-internal/**`, other plugin `src/**`, or relative outside package.
- Core/tests: no deep plugin internals (`extensions/*/src/**`, `onboard.js`). Use public barrels, SDK facade, generic contracts.
- Owner boundary: owner-specific repair/detection/onboarding/auth/defaults/provider behavior lives in owner plugin. Shared/core gets generic seams only.
- Dependency ownership follows runtime ownership: plugin-only deps stay plugin-local; root deps only for core imports or intentionally internalized bundled plugin runtime.
- Internal bundled plugins ship in core dist; bundled-only facade loader ok only for them.
- External official plugins own package/deps and are excluded from core dist; core uses registry-aware `facade-runtime` or generic contracts.
- Externalizing a bundled plugin: update package excludes, official catalogs, docs, tests, and prove core runtime paths resolve installed plugin roots before root-dep removal.
- Runtime reads canonical config only. No silent compat for old/malformed config keys. If a config change invalidates existing files, add a matching `openclaw doctor --fix` migration. Core/auth config repairs live in core doctor; plugin-owned config repairs live in that plugin's doctor contract (`legacyConfigRules` / `normalizeCompatibilityConfig`).
- OpenAI Codex is folded into `openai`. No new/live `openai-codex` provider/plugin/auth/model routes; treat them as legacy input only. Runtime/setup/auth/catalog use `openai` + `openai/*`; doctor/migrations repair stale `openai-codex/*` profiles/metadata.
- Config/env surface bar is high; `openclaw.json` and environment variables are already large. Before adding a config option or env var, first prove existing product behavior, provider selection, defaults, or doctor migration cannot solve it. Prefer removing or consolidating config/env options when touching these surfaces. Core supports only the latest config shape; `openclaw doctor --fix` migrates older shipped shapes into the current one.
- CLI setup flows are public API when external docs, installers, or integrations can copy them. Changes to `openclaw onboard`, `openclaw configure`, their documented flags, non-interactive behavior, or generated config shape are compatibility-sensitive API contract changes; prefer additive flags/aliases, deprecation windows, and backward-preserving migrations over breaking existing snippets.
- Fix shape: default to clean bounded refactor, not smallest patch. Move ownership to right boundary; delete stale abstractions, duplicate policy, dead branches, wrappers, fallback stacks.
- New binary fallible-operation results use `Result` from `@openclaw/normalization-core/result`; domain-rich outcomes keep named discriminated unions.
- Fix observed local failures with generic product rules; do not hardcode names, ids, log phrases, or user examples in prod code unless they are an explicit contract.
- Tests may use observed examples, but prod literals need a short contract reason.
- Compatibility is opt-in. "Shipped" means reachable from a release Git tag; main/GitHub/PR/unreleased code is not shipped.
- Refactor default: one canonical path. Delete the old path unless user explicitly wants compat or the shipped public contract is obvious and cited.
- Core runtime consumes only current canonical shapes/config/data. Legacy or retired shapes normalize only in doctor/migration code before runtime; no runtime shims, aliases, or fallback readers.
- State/storage migrations are database-first. Runtime reads/writes the canonical store only. Old file stores, sidecars, aliases, and fallback readers belong in `openclaw doctor --fix` migration code only, never steady-state runtime.
- Storage default: SQLite only. Do not add JSON/JSONL/TXT/sidecar files for OpenClaw-owned runtime state, caches, queues, registries, indexes, cursors, checkpoints, or plugin scratch data.
- Any SQLite change requiring a schema-version bump needs explicit user discussion and acceptance before implementation. Agents must not advance SQLite schema versions autonomously.
- SQLite runtime access uses Kysely helpers, not raw SQL statement strings, except schema DDL, migrations, low-level DB bootstrap, or narrowly justified SQLite primitives.
- SQLite write transactions are synchronous commit sections only. Finish async planning, filesystem access, plugin hooks, and predicates before `BEGIN`; then reread and validate authoritative rows before writing. Never return a Promise or execute `await` from a transaction callback.
- Use the shared state DB (`state/openclaw.sqlite`) for global runtime state and plugin KV data. Use the per-agent DB (`agents/<agentId>/agent/openclaw-agent.sqlite`) for agent-scoped state/cache. Use a dedicated SQLite DB only when schema, volume, or lifecycle clearly does not fit those stores.
- Legacy state/cache files are migration debt. When touching code that reads/writes them, prefer moving the data into SQLite or calling out the refactor follow-up; do not add parallel file paths.
- File storage must be a named product artifact: import/export, user attachment, log, backup, or external tool contract. If it is app state or cache, it belongs in SQLite.
- Before adding any path under state dirs, choose one: shared state DB, plugin KV, agent DB, or dedicated SQLite schema. If none fits, design the SQLite owner/schema first.
- Cache/transient state gets no compat migration unless a shipped user contract is cited. Prefer delete/drop/rebuild over import. If old state can be lost without user-visible data loss, remove the old path entirely.
- Persistent user state gets one migration owner. Doctor migrates, verifies, and then runtime assumes the new shape. No dual-write, read-through fallback, lazy import, or "if SQLite fails use JSON" branches.
- Fallback is a product decision, not an implementation convenience. Before adding one, name the shipped contract, failure mode, removal plan, and why doctor cannot solve it. Otherwise delete it.
- Keep old behavior only for an explicit public API/config/plugin SDK/data contract, tagged upgrade path, security/migration boundary, dependency contract, or observed prod state.
- If unsure, ask before preserving compat. Do not keep aliases, shims, fallback stacks, stale names, or obsolete tests just in case.
- Tests alone do not make internals contracts. If compat stays, name the contract and migration/removal plan in code, test, or PR.
- Lean code is a goal. No internal shims, aliases, legacy names, broad fallbacks, or defensive branches just to reduce diff or handle unrealistic edge cases.
- Handle real production states, tagged upgrade paths, security boundaries, and dependency contracts. Public/hostile/observed malformed input gets care; hypothetical malformed input does not.
- Deprecate shipped public contracts only.
- Plugin SDK exception: shipped external API gets new API first plus named compat/deprecation, small tests/docs if useful, removal plan.
- Migrate internal/bundled callers to modern API in the same change. Do not let internal compat become permanent architecture.
- Channels are implementation under `src/channels/**`; plugin authors get SDK seams. Providers own auth/catalog/runtime hooks; core owns generic loop.
- Message/channel plugins stay transport-only. They render portable presentation/actions, enforce transport limits, and map native callback envelopes. They do not own product command trees, plugin/provider policy, or feature-specific menus.
- Portable command UI must use typed presentation actions, not raw string inference. Do not make channels guess that `value` starting with `/` means a native command; core/owner plugins declare command actions, channels map them when supported.
- Raw callback data is transport/private. Approval, command, URL, web-app, and select actions must stay distinguishable before channel encoding so transport adapters do not special-case product strings.
- Agent run terminal state: normalize/merge via `src/agents/agent-run-terminal-outcome.ts`; do not rederive timeout/cancel precedence in projections.
- Hot paths should carry prepared facts forward: provider id, model ref, channel id, target, capability family, attachment class. Do not rediscover with broad plugin/provider/channel/capability loaders.
- Do not fix repeated request-time discovery with scattered caches. Move the canonical fact earlier; reuse prepared runtime objects; delete duplicate lookup branches.
- Gateway/plugin metadata is process-stable: installs, manifests, catalogs, generated paths, bundled metadata. Changes require restart or explicit owner reload/install/doctor flow.
- Runtime hot paths: no freshness polling (`stat`/`realpath`/JSON reread/hash). Reuse current snapshots, install records, discovery, lookup tables, root scopes, resolved paths.
- Process-local metadata caches ok when lifecycle-owned and bounded/single-slot. Freshness exceptions need named owner + tests.
- Inline comments: preserve reviewer context at the code site. Required for non-obvious cross-path/state invariants, lifecycle ordering, ownership boundaries, queue/dedupe symmetry, TTL/cache expiry, cleanup/release coupling, session/id adoption, fallback behavior, platform/dependency caps, deterministic ordering, compact encoded state, or intentional caller differences.
- Comment shape: 1-3 short lines; state why the branch/helper exists, what contract it protects, and the bad outcome if removed. Cite nearby constants/helpers when useful. No syntax narration, PR/user-specific lore, or obvious mechanics.
- Gateway protocol changes: additive first; incompatible needs versioning/docs/client follow-through.
- Protocol version bumps: explicit owner confirmation only; never automatic/generated.
- Config contract: exported types, schema/help, metadata, baselines, docs aligned. Retired public keys stay retired; compat in raw migration/doctor only.
- Prompt cache: deterministic ordering for maps/sets/registries/plugin lists/files/network results before model/tool payloads. Preserve old transcript bytes when possible.
- Agent tool schema cleanup: remove stale args cleanly; no hidden compat for model-facing params just to avoid churn.

## Commands

- Runtime: Node 22.22.3+, 24.15+, or 25.9+; Node 24 recommended. Keep Node + Bun paths working.
- Package manager/runtime: repo defaults only. No swaps without approval.
- Install: `pnpm install` (keep Bun lock/patches aligned if touched). Agent dependency installation for tests/builds defaults to the selected remote box; do not reconcile a local Codex worktree just to run validation.
- CLI: `pnpm openclaw ...` or `pnpm dev`; build: `pnpm build`.
- Packaged `pnpm build` omits QA Lab + qa-channel by design (source-checkout only). To exercise `openclaw qa`/qa-channel from a built dist, build with `OPENCLAW_BUILD_PRIVATE_QA=1 pnpm build` (emits `dist/plugin-sdk/qa-lab.js`, `qa-runtime.js`, `dist/extensions/{qa-lab,qa-channel}`) or run via `pnpm dev`.
- Agent proof routing: source trust first, proof size second. Only trusted source may run locally; then run one/few focused tests and cheap static checks locally when the existing checkout dependencies are ready. Use Crabbox only for larger suites, changed gates with typecheck/lint fan-out, builds, Docker, packaging, E2E, live proof, and cross-platform work. Trusted maintainer heavy proof defaults to Blacksmith Testbox. Contributor/fork code remains untrusted unless a maintainer explicitly approves credentialed execution after review; an explicit owner/maintainer instruction to land named, reviewed PRs is that approval, so do not ask twice. Otherwise use secretless fork CI or sanitized direct AWS Crabbox, never a credential-hydrated Testbox. Never run an untrusted checkout's scripts, tests, checks, wrappers, config, or package hooks locally, regardless of proof size. Sanitized AWS must launch an installed trusted Crabbox binary from a clean trusted `main` checkout and fetch only the remote PR via `--fresh-pr`; never execute a wrapper, config, or command from the untrusted local checkout. Before warmup, unset `CRABBOX_AWS_INSTANCE_PROFILE` and all `CRABBOX_TAILSCALE*` overrides; fail closed unless resolved `aws.instanceProfile` is empty. Force `--network public --tailscale=false`, clear exit-node/LAN flags, and require `crabbox inspect` to report public networking with no Tailscale state before any script. Upload trusted `scripts/crabbox-untrusted-bootstrap.sh` from clean `main` alongside `--fresh-pr`; it proves the remote IMDSv2 IAM credentials endpoint returns 404, verifies the reviewed head SHA, unsets `NODE_OPTIONS`, installs pinned Node/pnpm, verifies the package-manager pin, isolates `HOME`, installs dependencies, then runs the requested test. Use a newly warmed lease bound to one reviewed head SHA, set `CRABBOX_ENV_ALLOW=CI`, and use `--no-hydrate`. Never reuse a trusted/previously hydrated lease or carry an untrusted lease across head revisions; stop and rewarm when the SHA changes. No repo `OPENCLAW_*` allowlist, existing auth profile, instance role, tailnet/LAN access, moving PR head, or ambient Node preload may reach untrusted execution. Do not pre-warm at task start. Acquire the safe backend lazily for the first heavy proof, reuse that one lease, then stop it before handoff. Remote boxes are preferred, not mandatory: when the remote backend is unavailable (broker/DNS/network/lease failure), trusted-source work falls back to local execution — including heavier suites and gates — instead of blocking; note the fallback and reason in the proof summary. Untrusted source never falls back to local.
- Test commands: trusted-source focused local proof uses `node scripts/run-vitest.mjs <path-or-filter>`; remote or normal-checkout proof may use `pnpm test <path-or-filter> [vitest args...]`, `pnpm test:changed`, `pnpm test:serial`, or `pnpm test:coverage`. Never raw `vitest`.
- If raw Vitest is unavoidable, use `vitest run ...`; bare `vitest ...` starts local watch mode and will not exit on its own.
- Vitest repetition: no `--repeat`; use a bounded shell loop around the focused repo test command.
- Local agent test execution is allowed only for trusted source and one/few focused files when the existing dependency install is ready. In a Codex worktree or linked/sparse checkout, use `node scripts/run-vitest.mjs <path-or-filter>`; never direct local `pnpm test*`, and never reconcile dependencies merely to keep proof local.
- Checks/lint in a trusted normal source checkout: `pnpm check:changed` classifies first; docs-only, no-change, and small metadata plans stay local when dependencies are ready, while typecheck/lint fan-out delegates to Crabbox/Testbox. Never run this repository-controlled classifier locally for untrusted source. Inspect lanes with `pnpm changed:lanes --json`; staged/path-scoped forms are `pnpm check:changed --staged` and `pnpm check:changed -- <files...>`.
- Checks in a trusted Codex worktree or linked/sparse checkout: avoid direct local `pnpm check*`; use `node scripts/check-changed.mjs [--staged|-- <files...>]`. It can classify without installed dependencies and delegates heavy or dependency-missing proof before loading package-backed helpers. For untrusted source, do not execute this repository-controlled wrapper locally.
- Extension tests: `pnpm test:extensions`, `pnpm test extensions`, `pnpm test extensions/<id>`.
- Typecheck: `tsgo` lanes only (`pnpm tsgo*`, `pnpm check:test-types`); never add `tsc --noEmit`, `typecheck`, `check:types`.
- Formatting: `oxfmt`, not Prettier. Write paths with `pnpm format <paths>`; no `format:write` script. Checks use repo wrappers (`pnpm format:*`, `scripts/run-oxlint.mjs`; full `pnpm lint:*` only when scope requires).
- SDK surface gate: `pnpm plugin-sdk:surface:check`; no `plugin-sdk:surface-report` script.
- Build before push when build output, packaging, lazy/module boundaries, dynamic imports, or published surfaces can change; agent builds default to the selected remote box unless platform-specific proof requires another remote host.

## Validation

- Use `$openclaw-testing` for test/CI choice and `$crabbox` for remote/full/E2E proof.
- Classify source trust before proof size. Do not pre-warm for anticipated work. Run focused proof locally only for trusted source; untrusted source uses secretless fork CI or sanitized direct AWS regardless of size. Lazily acquire the appropriate backend at the first remote command. Trusted maintainer heavy proof prefers Blacksmith Testbox; if the remote backend is unavailable, run the proof locally for trusted source and say so in the proof summary rather than blocking. Reuse one acquired lease for later heavy commands, sync the current checkout for every run, then stop it before handoff.
- Warm Testbox from the task checkout; ownership is checkout-path scoped; `--reclaim` only for intentional transfer.
- One Testbox lease, one active command; never sync/reclaim during a run.
- Testbox `--reclaim` does not retarget the remote checkout; never cross repos.
- Base/head changed: stop and rewarm Testbox; never override stale lease checks.
- Compound Testbox commands: `bash -lc`, never `sh -lc`; job env uses Bash `declare`.
- Testbox cleanup: `blacksmith testbox stop --id <tbx_id>`; id is not positional.
- Delegated Testbox rejects `--fresh-pr` and `--stop-after`; sync current checkout, workflow owns lifecycle.
- PR review artifacts: keep template enum values; put evidence detail in summaries.
- Crabbox request means real scenario proof: install/update/call/repro user path; not just copy tests and run them remotely.
- Blacksmith Testbox delegated runs: omit `--stop-after`; unsupported, cleanup is delegated.
- Visual proof: use Crabbox, set up like a user, then screenshot-verify. No harness/bypass/shortcut unless explicitly asked.
- Trusted-source local agent work includes one/few focused tests, `git diff --check`, targeted formatting, and cheap static probes when dependencies already exist. Untrusted source executes none of its repository-controlled tooling locally. Computationally intensive work uses the selected remote box.
- In Codex or linked worktrees, direct local `pnpm test*`, `pnpm check*`, `pnpm crabbox:run`, and `scripts/committer` can trigger pnpm dependency reconciliation or install prompts. Prefer `node` wrappers locally and Crabbox/Testbox for pnpm-gated proof.
- Direct Blacksmith lease: use `blacksmith testbox run`; Crabbox wrapper reuse needs a wrapper-created lease.
- Wrapper Testbox reuse requires its local SSH key; missing after restart/handoff means warm fresh.
- Dirty-sync generator proof: compare hashes before/after; `git diff` includes the synced patch.
- Crabbox wrapper `stop` has no `--timing-json`; use `node scripts/crabbox-wrapper.mjs stop --provider <provider> --id <id>`.
- Repo-native PR worktree may omit `node_modules`; prove remotely, then use `git commit --no-verify`, not `scripts/committer`.
- Release-branch formatting: Testbox or existing binary; never local `pnpm exec` reconciliation.
- Targeted local format/lint: existing `./node_modules/.bin/*`; never `pnpm exec` reconciliation.
- Parallel agents share the checkout; never switch its branch while sibling work runs.
- Testbox status: `blacksmith testbox status --id <tbx_id>`; no `--json` flag.
- QA CLI `--output-dir` must be repo-relative.
- Full suites, changed gates, builds, typechecks, lint fan-out, Docker/package/E2E/live/cross-OS proof, or anything computationally intensive: Crabbox/Testbox.
- Testbox owns Chromium; never pass Crabbox `--browser` to `provider=blacksmith-testbox`.
- Testbox warmup must print a lease id; silent success is unusable. Verify before reuse; fall back to one-shot `run`.
- If local proof fans out or becomes expensive, stop it and lazily acquire the remote box.
- Before handoff/push: prove touched surface. Before landing to `main`: proof matches actual risk. Bounded behavior-neutral refactor: focused tests/checks enough; no issue proof or full/broad suite by default.
- Release-branch full validation: freeze the product-complete **Code SHA**, then use `node scripts/full-release-validation-at-sha.mjs --sha <code-sha> --target-ref release/YYYY.M.PATCH`; no raw dispatch without `target_context_ref`.
- Pre-land/pre-commit code changes: mandatory fresh `$autoreview` until no accepted/actionable findings remain. Do not land code on CI, ClawSweeper, prior review comments, or your own manual review alone unless user explicitly opts out or scope is truly trivial/docs-only. If findings want refactor, refactor; no ugly fixes.
- Autoreview uncommitted changes: `--mode uncommitted`; no `dirty` mode.
- Autoreview staged/uncommitted diff: use `--mode uncommitted`; no `staged` mode.
- If proof is blocked, say exactly what is missing and why.
- Do not land related failing format/lint/type/build/tests. If unrelated on latest `origin/main`, say so with scoped proof.
- Docs/changelog-only and CI/workflow metadata-only: `git diff --check` plus relevant docs/workflow sanity; escalate only if scripts/config/generated/package/runtime behavior changed.
- Prompt snapshots: CI truth is Linux Node 24. If macOS local passes but CI drifts, reproduce/generate in Linux before rerun.

## GitHub / PRs

- Fresh GitHub items: read `CONTRIBUTING.md`, the issue chooser/form, PR template, and `.github/CODEOWNERS`; blank issues are disabled; preserve templates and evidence requirements.
- Issue first for bugs, user-facing features, architecture/product decisions, or work needing durable discussion. Bounded maintainer-requested refactor may go direct; agent decides whether an issue adds value. PRs use the template, link context, and keep durable problem/impact/evidence sections.
- Route support to Discord and security through `SECURITY.md`. Use listed maintainer areas/`CODEOWNERS`; never guess mentions.
- Use `$openclaw-pr-maintainer` immediately for maintainer-side OpenClaw issue/PR review, triage, duplicates, labels, comments, close, land, or evidence. Contributor PR creation/refresh follows the requested contributor workflow; linked refs alone do not require maintainer archive tooling.
- Issue/PR start: `git status -sb`; if clean, `git pull --ff-only`; if dirty, yell before pull/rebase.
- PR refs: `gh pr view/diff` or `gh api`, not web search. Prefer `gitcrawl` for maintainer discovery; missing/stale `gitcrawl` falls through to live `gh`, not contributor setup. Verify live with `gh` before mutation.
- `gh pr view` takes the branch positionally; no `--head` flag.
- `gh pr diff` has no `--stat`; use `gh pr view --json changedFiles,additions,deletions` or `git diff --stat`.
- zsh: quote `gh api` endpoints containing `?` or brackets; otherwise glob expansion corrupts the invocation.
- `gh pr checks --json`: use `link`, not nonexistent `detailsUrl`.
- Blacksmith Testbox status/stop: `--id <tbx_id>`; no status JSON flag.
- Crabbox final timing JSON = proof complete; if portal sync hangs after it, interrupt wrapper only.
- Sparse-sync temp checkout may claim kept Testbox; repo-path reuse needs `--reclaim`.
- GitHub Actions: resolve workflow files from `.github/workflows` or API; never infer filenames from display names.
- Yielded exec: retain the returned session id before polling; never blind-retry.
- zsh: quote command globs; unmatched patterns abort before the tool runs.
- Nested remote shell: avoid local `$()` expansion; use remote-safe validation.
- zsh: don't use `path` as a variable; it rewrites `$PATH`.
- `scripts/pr` artifacts: preserve template enum values; validate before prepare.
- `scripts/pr` subcommands require a PR number; no subcommand `--help` placeholder.
- `scripts/pr` review: checkout main baseline, then PR, before artifact validation.
- Review artifacts: validate from PR-head mode; moving main invalidates main-baseline guard.
- `scripts/pr` prepare/merge: `main` PRs only; non-main uses reviewed release-branch flow.
- After every PR push, rerun `scripts/pr review-init`; checkout alone leaves stale guard SHA.
- `rg`: options/globs before `--`; `--` immediately before a leading-dash pattern only.
- `gh --jq` is not standalone `jq`; pipe JSON to `jq` for variables or `--arg`.
- Shared checkout: serialize `git fetch`; on ref-lock failure, re-read the ref before retry.
- Git fetch/pull yielding without completion: inspect/stop only the owned process before retry; never overlap retries.
- `gh api --paginate '<endpoint>' | jq -s ...`; gh `--slurp` may emit nothing and forbids `--jq`/`--template`.
- Main-bound workflow dispatch: resolve server `main` SHA immediately before dispatch; retry if identity fails after `main` advances.
- `gh run view --json` uses `attempt`, not `attemptNumber`.
- Crabbox stop: no `--timing-json`; use `node scripts/crabbox-wrapper.mjs stop --provider <provider> --id <id>`.
- macOS `find` has no `-printf`; use `-print0` plus `stat`.
- Actions checkout refs: use full 40-char SHAs; short SHAs resolve as branches/tags.
- zsh Git object paths: use `${sha}:path`; `$sha:path` invokes parameter modifiers.
- Bare issue/PR URL/number: inspect live and take the efficient maintainer path; switch branches/refs when useful.
- No unsolicited PR labels/retitles/rebases/fixups/landing. Comments/reviews ok only for reviewable findings, pre-merge proof, or close/duplicate reason after explicit close/sweep/landing request.
- Maintainer decision closes the cluster: if deciding reported behavior/proposed fix is not planned, comment+close all directly associated open issues/PRs unless explicitly told to keep one open. Associated means linked PRs/issues, duplicates, companion workaround PRs, and the canonical issue for the rejected behavior.
- Do not leave associated issues open for hypothetical future repros. Close with rationale; ask for a new issue or reopen only if concrete new evidence appears. Close comment states: decision, why, supported alternative, and what evidence would change the decision.
- Issue/PR work: search strong related issues/PRs before final; close proven dupes/fixed siblings. If none close, suggest one next related follow-up.
- PR superseded by `main`: if code proof shows `main` already has same-or-better behavior, comment canonical commit/PR + focused proof, then close. Bar high: inspect PR diff, current code/tests, linked issue, caller/sibling path. If unsure, leave open.
- Issue/PR numbers need a short summary every time; assume the reader has not opened or read them.
- Before presenting a batch of issues/PRs, use smart subagents to verify live state and current `main`; omit closed/fixed items, and comment+close items already fixed on `main` when maintainer action is authorized.
- Generic triage and landing shortlists: exclude PRs authored by maintainers with broad repository access until 14 days after creation. An ordinary request for landing candidates does not override this gate; only a named PR or explicit request for maintainer-owned work does.
- PR review answer: bug/behavior, URL(s), affected surface, provenance for regressions when traceable, best-fix judgment, evidence from code/tests/CI/current or shipped behavior.
- PR reviewable findings: post them on the PR, not chat-only, so author sees actionable feedback.
- Issue/PR final answer: last line is the full GitHub URL.
- PR verification: before merge, post land-ready work done, exact local commands, CI/Testbox run IDs, before/after proof when used, and known proof gaps.
- Issue fixed on `main` with proof: comment proof + commit/PR, then close.
- After landing or requested close/sweep: search duplicates; comment proof + canonical commit/PR/release before closing.
- After PR merge/ship: concise prose recap, not a bullet pile; cover behavior, key surface, proof, and issue/PR state. Check for worthwhile refactor or simplification follow-ups; suggest any warranted.
- `ship` that fixes an issue: after push, comment proof + commit link, then close the issue.
- Public GH comments: show draft in chat first unless user explicitly asked to post/comment/reply/close/merge/land. After work starts and changes/proof exist, post the review/proof/commit comment.
- Representing user: if user already has a comment/thread for the point, update/reply there when possible; avoid duplicate PR/issue comments.
- No surprise GH writes: chat must mention every posted/updated public comment with URL.
- GH comments with backticks, `$`, or shell snippets: use heredoc/body file, not inline double-quoted `--body`.
- PR create: real body required. Use the current template: `What Problem This Solves`, `Why This Change Was Made`, `User Impact`, and `Evidence`; include visible refs, behavior, and validation.
- PR create/refresh: keep PR branches takeover-ready. Use a branch maintainers can push to, or for fork PRs ensure `maintainer_can_modify` / GitHub's `Allow edits by maintainers` is enabled unless explicitly told otherwise or GitHub's Actions/secrets warning makes that unsafe.
- GitHub issue/PR create: read `$agent-transcript`; ask about sanitized transcript logs when available.
- Contributor PRs: parsed context requires authored `What Problem This Solves` and `Evidence` sections. Do not require field-level proof forms; reviewers inspect code, tests, and CI for correctness.
- PR artifacts/screenshots: attach to PR/comment/external artifact store. Never push screenshots, videos, proof images, or proof assets to OpenClaw or any product repo branch, including temp artifact branches. Use Crabbox artifact publishing plus the manifest URL. Do not commit `.github/pr-assets`.
- CI polling: exact SHA, relevant checks only, minimal fields. Skip routine noise (`Auto response`, `Labeler`, docs agents, performance/stale). Logs only after failure/completion or concrete need. Never `gh run watch`; its 3s polling exhausts API quota. Use sparse GraphQL rollups. Filter `gh run list` by workflow/branch/commit; broad JSON lists can exceed relay caps. `gh --jq` has no jq `--arg`; use `--commit` for SHA filtering. Reruns need `gh run view <run> --attempt <n>`; default output may show the prior attempt.
- Trusted-workflow release-branch CI: pass `target_ref` + `release_candidate_ref`; never `release_gate` (requires workflow head == target).
- Agent PR landing to `main`: use only the repo-native `scripts/pr` wrapper: run `scripts/pr review-init <PR>`, follow its emitted checkout/guard guidance, initialize and complete review artifacts with `scripts/pr review-artifacts-init <PR>`, validate them with `scripts/pr review-validate-artifacts <PR>`, then run `OPENCLAW_TESTBOX=1 scripts/pr prepare-run <PR>` and `scripts/pr merge-run <PR>`. The Testbox flag is mandatory for agents so prepare verifies hosted CI/Testbox on the current head or reuses a patch-identical pre-rebase run green within 24 hours instead of running full gates locally. `prepare-run` fails fast; invoke only after exact-head CI is complete and green. For owner-approved reviewed fork code without hosted Testbox, use `OPENCLAW_PR_GATES_REMOTE=testbox` instead. Do not rebase only because `main` advanced; merge drift is advisory unless strict drift is explicitly enabled, while GitHub still blocks conflicts. Do not idle on `auto-response` or `check-docs`.
- After GitHub throttling, check core quota before `scripts/pr prepare-run` or `merge-run`. A failed operation can retain its lock; verify no child remains, then recover only with its emitted token.
- Local `scripts/pr`: unset `GITHUB_TOKEN`, `GH_TOKEN`, `HOMEBREW_GITHUB_API_TOKEN`; ambient tokens can select an exhausted or wrong identity.
- Non-main PRs: do not run `scripts/pr prepare-run` or `merge-run`; they diff against `main`. Use review artifacts, exact base-head CI, revalidate `headRefOid`, then `gh pr merge --match-head-commit <verified-sha>`.
- Merge guard shells: start `set -euo pipefail`; a failed `[[ ... ]]` alone does not stop a later merge command.
- After `scripts/pr merge-run` removes its worktree, `cd` to a persistent repo before follow-up commands.
- `scripts/pr` review JSON: land-ready recommendation `READY FOR /prepare-pr`, `issueValidation.status=valid`; never `APPROVE`.

## Code

- TS ESM, strict. Avoid `any`; prefer real types, `unknown`, narrow adapters.
- No `@ts-nocheck`. Lint suppressions only intentional + explained.
- External boundaries: prefer `zod` or existing schema helpers.
- Runtime branching: discriminated unions/closed codes over freeform strings. Avoid semantic sentinels (`?? 0`, empty object/string).
- Cross-function state: when valid combos matter, return a closed mode/result shape. Avoid parallel nullable fields or derived booleans that callers must keep in sync; make impossible states unrepresentable.
- Formatter-friendly shape: when oxfmt explodes an expression vertically, extract named booleans, payloads, or small helpers. Do not change width or use format-ignore for local compactness.
- Calls should be boring: complex decisions happen above; call args/object fields are names, literals, or simple property reads.
- Prefer early returns over nested condition pyramids. Split code into gather -> normalize -> decide -> act.
- Use named intermediates only for domain meaning or readability; avoid temp-variable soup.
- Correct but not over-engineered. Correctness on real inputs/states is mandatory; extra layers, guards, and generality for imagined ones are defects, not rigor.
- Codebase is already large; pragmatism wins. Extremely unlikely edge cases are tradable for real simplification — name the accepted tradeoff (comment or PR) so it is a decision, not an oversight.
- Code size matters. Prefer small clear code; maintainability includes not growing LOC without payoff.
- Refactors should delete about as much local complexity as they add. If LOC grows, the new ownership/API needs to clearly pay for it.
- Refactors should reduce non-test LOC unless they remove a larger architectural cost. Treat positive prod LOC as a smell. Before closeout, run `git diff --numstat`; if non-test LOC grew, trim or explicitly justify why fewer paths now exist.
- Prefer deleting branches, modes, adapters, and tests over preserving them. A refactor that adds a second path has probably failed unless the old path is a cited shipped contract.
- New helpers/files must pay rent immediately: fewer call paths, fewer concepts, or less repeated logic. No helpers for one-off compat, naming translation, or speculative resilience.
- Before adding helpers/files, check whether existing code can absorb the behavior with less new surface.
- Keep APIs narrow: export only current caller needs; keep types/helpers local by default.
- Return the smallest useful shape. Avoid broad result objects, flags, metadata unless callers use them.
- Avoid adapter layers that only rename fields. Move real responsibility or leave code local.
- Inline simple one-use objects/spreads when clearer. Extract only when it removes duplication or hard logic.
- Tests prove behavior/regressions, not every internal branch.
- Tests are welcome, but review them before landing for duplication and value. Delete useless tests, such as assertions for behavior or paths just removed.
- Tests protect canonical behavior and migration boundaries, not obsolete internals. Delete tests for removed fallback paths instead of updating them.
- For non-trivial refactors, check `git diff --numstat` before closeout. If LOC grew, trim or explain why.
- Prefer existing narrow helpers over repeated casts/guards. Add local helpers when 2+ nearby call sites share real boundary logic.
- Prefer ctor parameter properties for injected deps/config. Do not ban them for erasable-syntax purity.
- Prefer `satisfies` for registries/config maps; derive types from schemas when a runtime schema already exists.
- Table-drive repetitive tests when it reduces code and keeps failure names clear.
- Dynamic import: no static+dynamic import for same prod module. Use `*.runtime.ts` lazy boundary. After edits: `pnpm build`; check `[INEFFECTIVE_DYNAMIC_IMPORT]`.
- Cycles: keep `pnpm check:import-cycles` + architecture/madge green.
- Classes: no prototype mixins/mutations. Prefer inheritance/composition. Tests prefer per-instance stubs.
- Split files around ~700 LOC when clarity/testability improves.
- Never add a `max-lines` suppression. Existing suppressions are grandfathered TODOs; split the file and remove its suppression plus baseline entry.
- Naming: **OpenClaw** product/docs; `openclaw` CLI/package/path/config.
- English: American spelling.

## Tests

- Vitest. Colocated `*.test.ts`; e2e `*.e2e.test.ts`; example models `sonnet-4.6`, `gpt-5.6-luna`; test GPT with Luna preferred; use Sol when capability matters; no GPT-4.x agent-smoke defaults.
- Prefer behavior tests over workflow/docs string greps. Put operator policy reminders in AGENTS/docs.
- QA scenario sources are YAML only: `qa/scenarios/index.yaml` and `qa/scenarios/<theme>/*.yaml`. Do not add fenced `qa-scenario`/`qa-flow` Markdown files under `qa/scenarios/`.
- Clean timers/env/globals/mocks/sockets/temp dirs/module state; `--isolate=false` safe.
- Tests asserting resolver/root-containment paths: `fs.realpath` mkdtemp/tmp roots first. macOS `os.tmpdir()` is a `/var` -> `/private/var` symlink; prod resolvers return canonical paths, so raw mkdtemp assertions pass on Linux CI but fail on Mac.
- Explicit `vi.mock` factories must export every binding prod touches, including error classes used in `instanceof` checks; `vi.importActual` the defining module for those instead of stub classes.
- Prefer injection and narrow `*.runtime.ts` mocks over broad barrels or `openclaw/plugin-sdk/*`.
- Do not edit baseline/inventory/ignore/snapshot/expected-failure files to silence checks without explicit approval.
- Do not run independent `pnpm test`/Vitest commands concurrently in one worktree; Vitest cache races with `ENOTEMPTY`. Group one command or use distinct `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH`.
- Vitest rejects Jest `--runInBand`; use `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test` for serial proof. Test workers max 16.
- Live: `OPENCLAW_LIVE_TEST=1 pnpm test:live`; verbose `OPENCLAW_LIVE_TEST_QUIET=0`.
- Live gateway tests: session-owned dev gateway only — isolated `OPENCLAW_STATE_DIR` + free port. Never bind the operator's real gateway port (default 18789) while their gateway runs.
- Never stop/restart/kickstart a gateway service you did not start (launchd/systemd/tmux) or edit its live `~/.openclaw` state/config; that is the operator's running instance — explicit per-task operator approval required.
- Realistic data: copy the state/DB into your dev state dir and test the copy. In-place migration of a live gateway's state needs explicit operator approval.
- Guide: `docs/reference/test.md`.

## Docs / Changelog

- Use `$technical-documentation` for docs writing/review. Docs change with behavior/API.
- Codex harness upgrade (`extensions/codex/package.json` `@openai/codex`): refresh `docs/plugins/codex-harness.md` model snapshot from the new harness `model/list`.
- Docs final answers: include relevant full `https://docs.openclaw.ai/...` URL(s). If issue/PR work too, GitHub URL last.
- `CHANGELOG.md`: release-only. Do not edit for normal PRs, direct `main` fixes, or `ship it`; release generation owns it. Do not ask contributors/agents for changelog edits.
- User-facing `fix`/`feat`/`perf`: put release-note context in PR body, squash message, or direct commit: behavior, surface, issue/PR refs, credited human author/reporter.
- Release generation: derive `CHANGELOG.md` from merged PRs + all direct `main` commits. Entries: active `### Changes`/`### Fixes`, single-line, thank credited humans; never thank bots/forbidden handles: `@openclaw`, `@clawsweeper`, `@codex`, `@steipete`.

## Git

- Commit via `scripts/committer "<msg>" <file...>`; stage intended files only.
- Commits: conventional-ish, concise, grouped.
- No manual stash/autostash unless explicit. Branch switches ok when useful; no new worktrees unless requested.
- `main`: no merge commits; rebase on latest `origin/main` before push. After one green run plus clean rebase sanity, do not chase moving `main` with repeated full gates.
- User says `commit`: your changes only. `commit all`: all changes in grouped chunks. `push`: may `git pull --rebase` first.
- User says `ship it`: commit intended changes, pull --rebase, push.
- Do not delete/rename unexpected files; ask if blocking, else ignore.
- Bulk PR close/reopen >50: ask with count/scope.

## Security / Release

- Never commit real phone numbers, videos, credentials, live config.
- Secrets: channel/provider creds in `~/.openclaw/credentials/`; model auth profiles in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.
- SecretRef failures isolate to the smallest known owning surface. Proven-inactive surfaces skip; unknown ownership fails closed. Gateway refuses startup only when its own ingress protection cannot be established, config is structurally invalid, or the owning surface is unknown. Otherwise start, mark the exact capability/account/route configured-unavailable, emit a typed redacted diagnostic, and forbid implicit credential fallback. On reload, retain last-known-good only for an unchanged ref+provider; a changed unresolved ref makes that owner cold. Doctor and status must list every degraded owner.
- Dependency patches/overrides/vendor changes need explicit approval. `pnpm-workspace.yaml` patched dependencies use exact versions only.
- Release/package guards: no hard-coded retired-package denylists; use generic artifact/dependency checks or fix build source.
- Lockfiles/shrinkwrap are security surface: review `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `package-lock.json`; root/plugin npm packages ship shrinkwrap, not package-lock.
- Carbon pins owner-only: do not change `@buape/carbon` unless Shadow (`@thewilloftheshadow`, verified by `gh`) asks.
- Releases/publish/version bumps need explicit approval. Use `$release-openclaw-maintainer`.
- Active release scope lock: freeze the operator-selected cut SHA and release
  identity through publish and verification. Moving `main`, unrelated CI,
  optional backports, refactors, cleanup, and normal forward-ports are not part
  of the release work queue.
- Touch `main` during a release only when the operator requests it or the
  smallest critical main-owned blocker prevents that release. Return to the
  release branch immediately; defer broader main work until closeout.
- Release versions use `YYYY.M.PATCH`, where `PATCH` is a sequential monthly release-train number, never the calendar day. Stable and beta tags determine the current train; alpha-only tags do not consume or advance the beta/stable patch number. After `2026.6.5`, the next beta train is `2026.6.6-beta.1` even if higher alpha-only tags exist.
- Alpha/nightly versions use the next unreleased train plus an incrementing prerelease number. Repeated nightlies for the same train increment only `alpha.N`; they must not mint a new patch number from the date.
- Backports are optional. Apply only the operator-selected set; when requested without a target, use the newest open `release/` branch.
- Regular beta/stable flow has two immutable identities:
  - **Code SHA**: version prep plus any optional backports/release fixes, with no release changelog mutation. Full product validation belongs here.
  - **Release SHA**: a descendant of the green Code SHA whose complete diff is exactly `CHANGELOG.md`. Tag, npm preflight, package/install acceptance, and publish belong here.
- Never generate the release changelog before the Code SHA has green Full Release Validation. A product/code failure changes the Code SHA and restarts product validation. A workflow/harness/infrastructure failure is fixed in trusted tooling and rerun against the same Code SHA; do not mutate the candidate to satisfy newer tooling.
- After green Code SHA validation, generate and review `CHANGELOG.md` once. Dispatch Full Release Validation for the Release SHA with evidence reuse enabled; `changelog-only-release-v1` may reuse the Code SHA product evidence only when GitHub independently proves the entire descendant delta is `CHANGELOG.md`. Any other path change requires a new Code SHA and fresh full validation.
- Release-SHA proof is intentionally narrow: release-note/provenance checks, npm preflight/package bytes, install/update acceptance, and publish readiness. Do not rerun the full product matrix merely because the changelog changed.
- Pass the successful Release-SHA validation run and npm preflight run into `release:candidate`; do not let the candidate helper dispatch duplicate copies of evidence that already passed.
- Keep one release operator and one watcher per release identity. Resume partial publish from successful immutable child artifacts/runs; never rebuild or republish an already-published package version.
- GHSA/advisories: `$openclaw-ghsa-maintainer` / `$security-triage`. Secret scanning: `$openclaw-secret-scanning-maintainer`.
- Beta tag/version match: `vYYYY.M.PATCH-beta.N` -> npm `YYYY.M.PATCH-beta.N --tag beta`.

## Platform / Ops

- Before simulator/emulator testing, check real iOS/Android devices.
- "restart iOS/Android apps" = rebuild/reinstall/relaunch, not kill/launch.
- SwiftUI: Observation (`@Observable`, `@Bindable`) over new `ObservableObject`.
- Mac gateway: dev watch = `pnpm gateway:watch`; managed installs = `openclaw gateway restart/status --deep`; logs = `./scripts/clawlog.sh`. No launchd/ad-hoc tmux.
- Mac app permission testing: stable app path + real signing identity required. No `--no-sign`, `SIGN_IDENTITY=-`, or raw debug binary; TCC prompts/listing won't stick.
- Version bump surfaces live in `$release-openclaw-maintainer`.
- Parallels: `$openclaw-parallels-smoke`; Discord roundtrip: `$parallels-discord-roundtrip`.
- Crabbox/WebVNC human demos: keep remote desktop visible/windowed; no fullscreen remote browser unless video/capture-style output.
- Before sharing WebVNC links, use Crabbox screenshot first; verify real app/path works and target UI is not broken.
- ClawSweeper ops: `$clawsweeper`. Deployed hook sessions may post one concise `#clawsweeper` note only when surprising/actionable/risky; if using message tool, reply exactly `NO_REPLY`.
- Generated-media completions wake the requester agent first. Requester visible-reply config decides final text vs message tool; direct media send is fallback/recovery only.
- `message_tool_only`: normal agent final visible reply = current-source `message(action=send)` only. No `NO_REPLY` prompt/contract; no message call = no source reply. Plugin-owned bound-thread reply = plugin return value; no message tool needed. Never auto-publish private final.
- Memory wiki prompt digest stays tiny; prefer `wiki_search` / `wiki_get`; verify contact data before use; source-class provenance for generated people facts.
- Rebrand/migration/config warnings: run `openclaw doctor`.
- Never edit `node_modules`.
- Local-only `.agents` ignores: `.git/info/exclude`, not repo `.gitignore`.
- Provider tool schemas: prefer flat string enum helpers over `Type.Union([Type.Literal(...)])`; some providers reject `anyOf`.
- External messaging: no token-delta channel messages. Follow `docs/concepts/streaming.md`.

<!-- 2026-08-03: merged verbatim from legacy AIREADME.md during the one-file migration. Compact this section to current constraints/state when next maintaining the project. -->

## Legacy project state and durable context

# Goal

- Repository: `openclaw/openclaw`, maintained as the user's fork at `AlexbeatsZ/openclaw`.
- Long-term scope: preserve the upstream-compatible OpenClaw delivery shell while adding fork-specific providers, channel behavior, operations, and isolated Life/Professional conversation cores.
- Maintenance policy: push ongoing work to `origin`; use `upstream` only for fetch/sync unless the user explicitly requests an upstream PR.

# Current State

- Branch: `feat/dual-agent-cores`; deployed implementation commit: `a1a9b257926fc6376445ec23cccf20640a1db4f7`.
- Life and Professional keep isolated workspace, transcript, bootstrap, and memory state, while both use the shared OpenClaw model catalog and execution adapters. The server default is `agy/flash`, backed by the existing `agy` CLI authentication/runtime.
- Control UI is desktop-first and responsive: the root URL and sidebar Home open the new-session workbench, while `/chat` is retained only as the destination for concrete sessions. The new-session page uses a two-column workbench on desktop and a compact single-column phone layout. Life/Professional selection is an accessible inline radio group, draft text survives core changes, and incompatible remote targets reset with an explanation. The OpenClaw custodian page is also a desktop two-column workspace; Agy's unsupported setup-inference mode is presented as a localized recovery path instead of a raw English error.
- Simplified Chinese covers the product UI and dynamic configuration-schema labels. The large schema catalog is loaded only with the `zh-CN` locale. Product/protocol names, commands, paths, config keys, enum values, and other executable identifiers remain unchanged.
- Theme mode (`system` / `light` / `dark`) is directly available in the desktop sidebar footer; existing theme tokens provide the night-mode surface.
- QQ command surface: `/mode status`, `/mode life`, `/mode professional`; Chinese aliases include `生活` and `工作`.
- Server WSL on `meta@100.106.169.46` is the runtime; the local Windows checkout is code/test only. Gateway service, health endpoint, and QQ WebSocket connection are healthy.
- The superseded strict Claude/ACPX configuration is removed. Professional Core requires no Claude authentication and ignores stale ACP metadata; external native-session catalogs remain excluded because their history ownership would bypass core isolation.
- The QQ external plugin capsule remains pinned to the locally built `2026.7.2-6bc85cd5` artifact because this correction does not change QQ plugin code.
- Server WSL Node is `22.23.1`.
- Last verified: 2026-07-29.

# Recent Changes

- Reworked and deployed the Control UI as a responsive desktop workbench with a phone breakpoint, visible night-mode control, accessible dual-core selection, and complete Simplified Chinese runtime/config metadata. The root URL and Home navigation now retire the legacy chat landing in favor of the task-first workbench, while existing session links still use chat. Production build and performance budgets passed; Gateway health recovered after restart.
- Added and deployed trusted-agent cron authoring for model-free `command` jobs and `on-exit` schedules. The built-in `cron` tool can now create and manage same-agent jobs without an approval prompt, while cross-agent/session isolation remains enforced; command announce delivery also preserves `threadId`.
- Added isolated Life and Professional conversation cores with separate identity, history, workspace, memory, and session ownership. Core switches rotate the session lifecycle while preserving an explicit shared model selection.
- Added QQ `/mode` switching/status commands, Control UI core selection, Professional `AGENTS.md` bootstrap, and Life-memory prompt/recall improvements.
- Replaced the erroneous Claude-only Professional ACP runtime with the shared OpenClaw/agy model path. Server integration tests passed, and a real Professional `agy/flash` run returned `AGY_PROFESSIONAL_OK` without fallback.
- Fixed `/home/meta/.config/openclaw/agy-proxy.env` from a stale Tailscale proxy address to the working local proxy so expired Agy OAuth tokens refresh headlessly again.
- Routed QQ token and official API requests through the trusted service proxy. The service now restores proxy variables after later drop-ins clear them, and the managed QQ plugin capsule is rebuilt and installed from this branch.

# Lessons Learned

## Cron / scheduled task implementation

- Public surface: `src/cron/service.ts` exposes `CronService`, a thin facade over locked operation helpers in `src/cron/service/ops.ts`. Main methods are `start`, `stop`, `status`, `list`, `add`, `update`, `remove`, `run`, and `enqueueRun`.
- Persisted job shape: `src/cron/types.ts` defines four schedule forms: `at`, `every`, `cron`, and `on-exit`. Payloads include model-backed `agentTurn`, main-session `systemEvent`, and model-free Gateway-host `command` execution. Agent-turn cron payloads can specify `payload.model` and per-job `payload.fallbacks`, where `fallbacks` overrides agent/global fallback config when present.
- Schedule math: `src/cron/schedule.ts` computes next/previous timestamps. `cron` expressions use `croner` with an LRU-like cache capped at 512 entries. Timezone defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`. There is a defensive retry path for a Croner past-time/year-rollback issue, including Asia/Shanghai cases.
- Job-level schedule semantics: `src/cron/service/jobs.ts` wraps raw schedule math. `every` prefers `lastRunAtMs + everyMs`, otherwise uses an anchor; `at` one-shot jobs remain due until they complete successfully; `cron` supports deterministic staggering and retries the next second if initial computation is undefined.
- Scheduler loop: `src/cron/service/timer.ts` owns the single timer. `armTimer` clears any previous timeout, skips when stopped/disabled/restart-recovery-pending, clamps wakes to a max interval, and floors zero-delay wakes to avoid hot loops. `onTimer` reloads state, reserves due jobs by persisting `runningAtMs`, executes outside the lock, writes results, and rearms.
- Concurrency model: mutation/read repair paths use `locked(state, ...)`; long job execution intentionally happens outside the lock. A job with `state.runningAtMs` is not due, and active markers protect restart/cancel races.
- Execution modes: main-session jobs enqueue `systemEvent` text and request/trigger heartbeat. Detached jobs execute either `command` via `runCommandJob` or `agentTurn` via `runIsolatedAgentJob`.
- Trusted agent authoring: the built-in `cron` tool exposes `command` payload and `on-exit` schedule schemas and may manage jobs within its existing agent/owner/session scope without a separate approval workflow. Command cron runs outside `tools.exec` sandbox/approval policy, so granting `cron` now grants Gateway-host scheduled command execution and should remain limited to trusted agents.
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
- Do not rebuild `dist` in place while the Gateway is still running: hashed runtime chunks can disappear before the old process executes plugin stop hooks. The 2026-07-29 deployment logged a non-fatal browser-control `ERR_MODULE_NOT_FOUND` during old-process shutdown for this reason, while the new process started cleanly. Prefer a staged build/swap or stop-before-build when downtime is acceptable.
- The root bundled-plugin build excludes QQ. Production QQ changes must be built and packed from `extensions/qqbot`, installed into the managed `~/.openclaw/npm/projects/openclaw-qqbot-*` capsule, and have the package-local `node_modules/openclaw` peer link restored to the deployed repository before restarting the gateway.
- Do not create local Windows OpenClaw runtime config as a substitute for server deployment. A mistaken local `C:\Users\Meta\.openclaw\openclaw.json` was created during agy default-model testing and then removed.
- Local Windows cleanup audit after the mistaken config creation found no local OpenClaw deployment: no `openclaw` command, no `C:\Users\Meta\.openclaw` or `.clawdbot`, no matching Windows service, no scheduled task, and no OpenClaw process. Temporary backup/probe artifacts from that mistaken local config attempt were also removed from `%LOCALAPPDATA%\Temp\.agents`.

## Control UI localization

- Dynamic config labels and help text come from `src/config/schema.labels.ts` and `src/config/schema.help.ts`, not the ordinary Control UI locale tree. Simplified Chinese therefore registers a separate lazy schema catalog when `zh-CN` loads; do not add that catalog to the startup bundle.
- Translation audits must preserve executable grammar and canonical terminology. In particular, do not translate query syntax, prompt headings, lifecycle/config keys, CLI commands, paths, `Gateway`, `Control UI`, `Agent Communication Protocol`, or `Model Context Protocol`.

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

- 2026-07-29 trusted-agent command/on-exit cron authoring passed 645 targeted Vitest assertions across the agent tool, flat recovery, Gateway caller scope, command delivery, and schema suites; `tsgo:core`, modified-file oxfmt/oxlint, and the full build also passed under isolated Node `24.18.0`.
- Server WSL deployment of `bf80bc1197` fast-forwarded `/home/meta/Project/Workspaces/openclaw`, rebuilt successfully under Node `22.23.1` and pnpm `11.2.2`, restarted `openclaw-gateway.service`, and verified clean HEAD, 16 loaded plugins, QQ WebSocket connected, command schema present in `dist`, and `/health` returning `{"ok":true,"status":"live"}`. Rollback bundle and service-unit backup: `/home/meta/.openclaw/backups/openclaw-agent-command-cron-before-20260729-020547`.
- 2026-07-18 upstream sync targets official snapshot `66f4ccabc505fb211e151474e7385b1975cb1f30` (`2026.7.2`) while preserving the fork's direct cron delivery, agy provider, QQBot UTF-8 chunking, generic CLI streaming decoder, and replay-safe fallback behavior.
- The official Cron Control UI was reorganized from the old `ui/src/ui/views/cron.ts` / controller layout into `ui/src/pages/cron/view.ts` and `ui/src/lib/cron/index.ts`. Direct-delivery controls and validation must be ported into those new canonical files; retaining only the deleted old UI files does not preserve the feature.
- The new scheduler uses exact active-job and command-lane task markers. A direct cron run may ignore only its own markers; it must still defer when any other cron job or cron lane task is active.
- The new OpenClaw runtime requires Node `>=22.22.3 <23`, `>=24.15.0 <25`, or `>=25.9.0`. Windows Node `24.14.1` is intentionally rejected because its embedded SQLite `3.51.2` has the upstream WAL-reset corruption risk. Server WSL was upgraded from Node `22.22.0` to `22.23.1` before deployment validation.
- 2026-07-18 local verification passed: Control UI Cron tests (116), agy tests (10), QQBot outbound tests (22), core and extension `tsgo`, Control UI i18n verify, Kysely generated-schema verify, and the replay-safe fallback classifier tests (22). The full build completed compilation of backend, bundled plugins, plugin SDK, and Control UI, then stopped only at the final CLI metadata runtime check because local Windows Node is `24.14.1`; final SQLite-dependent tests and full build must run in server WSL Node `22.23.1`.

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
- Disabling the Windows WinINET proxy does not remove proxy variables explicitly embedded in the WSL systemd unit. After the localhost proxy listener disappears, unset `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, and `https_proxy` at the service boundary and verify the real gateway process environment plus an endpoint-level QQBot WebSocket connection.
- Agy model versions must not be duplicated across source, manifest, tests, runtime defaults, and cron payloads. The Agy model-directory Module now reads `agy models`, selects the latest numeric Gemini Flash/Pro family, and exposes stable `agy/flash` and `agy/pro` Interfaces.
- Agy thinking variants must come from the discovered CLI rows. The Adapter only constructs a variant that was reported; `off`/`minimal` map to the lowest discovered level and `xhigh`/`max` to the highest. A persisted runtime snapshot is the fallback Seam when live discovery is temporarily unavailable.
- `agy models` output may use either slug ids or human-readable names such as `Gemini 3.6 Flash (High)`. Preserve the exact reported executable name; do not reconstruct it from the display family.
- Generic CLI discovery must use the same effective `agents.defaults.cliBackends.agy` command/env and caller workspace as execution. Plugin-specific command/cwd/env belongs only to the custom stream Adapter.

# Task Board

- [x] Upgrade server WSL Node from `22.22.0` to supported `22.23.1`.
- [x] Create a safety branch before syncing the fork with the 2026-07-18 official snapshot.
- [x] Merge official snapshot `66f4ccabc505fb211e151474e7385b1975cb1f30` and resolve conflicts without dropping fork features.
- [x] Port main-session program delivery controls into the official reorganized Cron Control UI.
- [x] Run local focused tests, type checks, i18n verification, schema verification, formatting, and compilation.
- [ ] Commit and push the merged fork branch.
- [ ] Back up the server checkout, deploy the merged branch, rebuild under WSL Node `22.23.1`, restart the gateway, and verify live health/plugins.

- [x] Investigate OpenClaw system prompt structure and write study notes to `docs/research/openclaw-system-prompt.md`.
- [x] Confirm local GitHub authentication.
- [x] Fork `openclaw/openclaw` to the logged-in GitHub account.
- [x] Move fork checkout to `C:\Users\Meta\Project\Workspaces\ai-agent\openclaw`.
- [x] Add `upstream` remote pointing at `https://github.com/openclaw/openclaw.git`.
- [x] Analyze scheduled task / cron code.
- [x] Deploy trusted-agent `command` / `on-exit` cron authoring to server WSL after explicit deployment confirmation.
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
- [x] Deploy the private QA build fix, enable the private QA runtime alias, and verify a clean cold gateway start.
- [x] Remove stale service-level localhost proxy variables and verify QQBot reconnects with HTTP 200 and an active WebSocket.
- [x] Upgrade the server's concrete Agy Flash model and all explicit cron references from 3.5 to 3.6.
- [x] Replace Agy version hardcoding with a live model-directory Module and stable `agy/flash` / `agy/pro` references.
- [ ] Deploy the dynamic Agy catalog, persist the current 3.6 discovery snapshot, and migrate the server default plus all explicit cron model references to `agy/flash`.
