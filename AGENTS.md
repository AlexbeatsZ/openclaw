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
- Fix observed local failures with generic product rules; do not hardcode names, ids, log phrases, or user examples in prod code unless they are an explicit contract.
- Tests may use observed examples, but prod literals need a short contract reason.
- Compatibility is opt-in. "Shipped" means reachable from a release Git tag; main/GitHub/PR/unreleased code is not shipped.
- Refactor default: one canonical path. Delete the old path unless user explicitly wants compat or the shipped public contract is obvious and cited.
- Core runtime consumes only current canonical shapes/config/data. Legacy or retired shapes normalize only in doctor/migration code before runtime; no runtime shims, aliases, or fallback readers.
- State/storage migrations are database-first. Runtime reads/writes the canonical store only. Old file stores, sidecars, aliases, and fallback readers belong in `openclaw doctor --fix` migration code only, never steady-state runtime.
- Storage default: SQLite only. Do not add JSON/JSONL/TXT/sidecar files for OpenClaw-owned runtime state, caches, queues, registries, indexes, cursors, checkpoints, or plugin scratch data.
- SQLite runtime access uses Kysely helpers, not raw SQL statement strings, except schema DDL, migrations, low-level DB bootstrap, or narrowly justified SQLite primitives.
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

- Runtime: Node 22.19+; Node 24 recommended. Keep Node + Bun paths working.
- Package manager/runtime: repo defaults only. No swaps without approval.
- Install: `pnpm install` (keep Bun lock/patches aligned if touched).
- CLI: `pnpm openclaw ...` or `pnpm dev`; build: `pnpm build`.
- Tests in a normal source checkout: `pnpm test <path-or-filter> [vitest args...]`, `pnpm test:changed`, `pnpm test:serial`, `pnpm test:coverage`; never raw `vitest`.
- If raw Vitest is unavoidable, use `vitest run ...`; bare `vitest ...` starts local watch mode and will not exit on its own.
- Tests in a Codex worktree or linked/sparse checkout: avoid direct local `pnpm test*`; use `node scripts/run-vitest.mjs <path-or-filter>` for tiny explicit-file proof, or Crabbox/Testbox for anything broader.
- Checks in a normal source checkout: `pnpm check:changed` delegates to Crabbox/Testbox; lanes: `pnpm changed:lanes --json`; staged: `pnpm check:changed --staged`; full: `pnpm check`.
- Checks in a Codex worktree or linked/sparse checkout: avoid direct local `pnpm check*`; use `node scripts/crabbox-wrapper.mjs run ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed` so pnpm runs inside Testbox, not locally.
- Extension tests: `pnpm test:extensions`, `pnpm test extensions`, `pnpm test extensions/<id>`.
- Typecheck: `tsgo` lanes only (`pnpm tsgo*`, `pnpm check:test-types`); never add `tsc --noEmit`, `typecheck`, `check:types`.
- Formatting: `oxfmt`, not Prettier. Use repo wrappers (`pnpm format:*`, `pnpm lint:*`, `scripts/run-oxlint.mjs`).
- Build before push when build output, packaging, lazy/module boundaries, dynamic imports, or published surfaces can change.

## Validation

- Use `$openclaw-testing` for test/CI choice and `$crabbox` for remote/full/E2E proof.
- Crabbox request means real scenario proof: install/update/call/repro user path; not just copy tests and run them remotely.
- Visual proof: use Crabbox, set up like a user, then screenshot-verify. No harness/bypass/shortcut unless explicitly asked.
- Small/narrow tests, lints, format checks, and type probes are fine locally only in a healthy normal checkout.
- In Codex worktrees, direct local `pnpm test*`, `pnpm check*`, `pnpm crabbox:run`, and `scripts/committer` can trigger pnpm dependency reconciliation or install prompts. Prefer `node` wrappers locally and Crabbox/Testbox for pnpm-gated proof.
- Full suites, broad changed gates, Docker/package/E2E/live/cross-OS proof, or anything that bogs down the Mac: Crabbox/Testbox.
- One/few files local. If a local command fans out, stop and move broad proof to Crabbox/Testbox.
- Before handoff/push: prove touched surface. Before landing to `main`: issue proof plus appropriate full/broad proof unless scope is clearly narrow.
- Pre-land/pre-commit code changes: mandatory fresh `$autoreview` until no accepted/actionable findings remain. Do not land code on CI, ClawSweeper, prior review comments, or your own manual review alone unless user explicitly opts out or scope is truly trivial/docs-only. If findings want refactor, refactor; no ugly fixes.
- If proof is blocked, say exactly what is missing and why.
- Do not land related failing format/lint/type/build/tests. If unrelated on latest `origin/main`, say so with scoped proof.
- Docs/changelog-only and CI/workflow metadata-only: `git diff --check` plus relevant docs/workflow sanity; escalate only if scripts/config/generated/package/runtime behavior changed.
- Prompt snapshots: CI truth is Linux Node 24. If macOS local passes but CI drifts, reproduce/generate in Linux before rerun.

## GitHub / PRs

- Use `$openclaw-pr-maintainer` immediately for maintainer-side OpenClaw issue/PR review, triage, duplicates, labels, comments, close, land, or evidence. Contributor PR creation/refresh follows the requested contributor workflow; linked refs alone do not require maintainer archive tooling.
- Issue/PR start: `git status -sb`; if clean, `git pull --ff-only`; if dirty, yell before pull/rebase.
- PR refs: `gh pr view/diff` or `gh api`, not web search. Prefer `gitcrawl` for maintainer discovery; missing/stale `gitcrawl` falls through to live `gh`, not contributor setup. Verify live with `gh` before mutation.
- Bare issue/PR URL/number: inspect live and take the efficient maintainer path; switch branches/refs when useful.
- No unsolicited PR labels/retitles/rebases/fixups/landing. Comments/reviews ok only for reviewable findings, pre-merge proof, or close/duplicate reason after explicit close/sweep/landing request.
- Maintainer decision closes the cluster: if deciding reported behavior/proposed fix is not planned, comment+close all directly associated open issues/PRs unless explicitly told to keep one open. Associated means linked PRs/issues, duplicates, companion workaround PRs, and the canonical issue for the rejected behavior.
- Do not leave associated issues open for hypothetical future repros. Close with rationale; ask for a new issue or reopen only if concrete new evidence appears. Close comment states: decision, why, supported alternative, and what evidence would change the decision.
- Issue/PR work: search strong related issues/PRs before final; close proven dupes/fixed siblings. If none close, suggest one next related follow-up.
- PR superseded by `main`: if code proof shows `main` already has same-or-better behavior, comment canonical commit/PR + focused proof, then close. Bar high: inspect PR diff, current code/tests, linked issue, caller/sibling path. If unsure, leave open.
- Issue/PR numbers need a short summary every time; assume the reader has not opened or read them.
- Before presenting a batch of issues/PRs, use smart subagents to verify live state and current `main`; omit closed/fixed items, and comment+close items already fixed on `main` when maintainer action is authorized.
- PR review answer: bug/behavior, URL(s), affected surface, provenance for regressions when traceable, best-fix judgment, evidence from code/tests/CI/current or shipped behavior.
- PR reviewable findings: post them on the PR, not chat-only, so author sees actionable feedback.
- Issue/PR final answer: last line is the full GitHub URL.
- PR verification: before merge, post land-ready work done, exact local commands, CI/Testbox run IDs, before/after proof when used, and known proof gaps.
- Issue fixed on `main` with proof: comment proof + commit/PR, then close.
- After landing or requested close/sweep: search duplicates; comment proof + canonical commit/PR/release before closing.
- After landing/ship final: include 2-5 sentence recap of what landed: behavior change, key files/surface, proof run, issue/PR state. Do not answer with only status/links.
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
- CI polling: exact SHA, relevant checks only, minimal fields. Skip routine noise (`Auto response`, `Labeler`, docs agents, performance/stale). Logs only after failure/completion or concrete need.
- Agent PR landing to `main`: use only the repo-native `scripts/pr` wrapper: run `scripts/pr review-init <PR>`, follow its emitted checkout/guard guidance, initialize and complete review artifacts with `scripts/pr review-artifacts-init <PR>`, validate them with `scripts/pr review-validate-artifacts <PR>`, then run `scripts/pr prepare-run <PR>` and `scripts/pr merge-run <PR>`; do not idle on `auto-response` or `check-docs`.

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
- Naming: **OpenClaw** product/docs; `openclaw` CLI/package/path/config.
- English: American spelling.

## Tests

- Vitest. Colocated `*.test.ts`; e2e `*.e2e.test.ts`; example models `sonnet-4.6`, `gpt-5.5`; test GPT with 5.5 preferred, 5.4 ok; no GPT-4.x agent-smoke defaults.
- Prefer behavior tests over workflow/docs string greps. Put operator policy reminders in AGENTS/docs.
- QA scenario sources are YAML only: `qa/scenarios/index.yaml` and `qa/scenarios/<theme>/*.yaml`. Do not add fenced `qa-scenario`/`qa-flow` Markdown files under `qa/scenarios/`.
- Clean timers/env/globals/mocks/sockets/temp dirs/module state; `--isolate=false` safe.
- Prefer injection and narrow `*.runtime.ts` mocks over broad barrels or `openclaw/plugin-sdk/*`.
- Do not edit baseline/inventory/ignore/snapshot/expected-failure files to silence checks without explicit approval.
- Do not run independent `pnpm test`/Vitest commands concurrently in one worktree; Vitest cache races with `ENOTEMPTY`. Group one command or use distinct `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH`.
- Test workers max 16. Memory pressure: `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`.
- Live: `OPENCLAW_LIVE_TEST=1 pnpm test:live`; verbose `OPENCLAW_LIVE_TEST_QUIET=0`.
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
- Dependency patches/overrides/vendor changes need explicit approval. `pnpm-workspace.yaml` patched dependencies use exact versions only.
- Release/package guards: no hard-coded retired-package denylists; use generic artifact/dependency checks or fix build source.
- Lockfiles/shrinkwrap are security surface: review `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `package-lock.json`; root/plugin npm packages ship shrinkwrap, not package-lock.
- Carbon pins owner-only: do not change `@buape/carbon` unless Shadow (`@thewilloftheshadow`, verified by `gh`) asks.
- Releases/publish/version bumps need explicit approval. Use `$release-openclaw-maintainer`.
- Release versions use `YYYY.M.PATCH`, where `PATCH` is a sequential monthly release-train number, never the calendar day. Stable and beta tags determine the current train; alpha-only tags do not consume or advance the beta/stable patch number. After `2026.6.5`, the next beta train is `2026.6.6-beta.1` even if higher alpha-only tags exist.
- Alpha/nightly versions use the next unreleased train plus an incrementing prerelease number. Repeated nightlies for the same train increment only `alpha.N`; they must not mint a new patch number from the date.
- Backport means apply to newest open `release/` branch unless user names another target.
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

# Project Goal

- Repository: `openclaw/openclaw`, forked to `AlexbeatsZ/openclaw` and cloned locally at `C:\Users\Meta\Project\Workspaces\ai-agent\openclaw`.
- Current task: implement optional `main + direct` cron delivery so scheduled AI output can be captured by the program and forwarded to QQ without asking the model to call the message tool.
- Maintenance policy: this is now maintained as the user's own fork/project. Do not submit upstream PRs by default; push ongoing work to `origin` (`AlexbeatsZ/openclaw`) and use `upstream` only for fetching/syncing upstream changes.
- Current task: add an OpenClaw model provider for `agy` CLI so OpenClaw can forward prompts to `agy -p` and return the CLI output as assistant text, without reverse proxying or modifying agy's internal prompts.
- Current task: replace the weak settings landing experience with a polished Control Center that exposes custom-fork capabilities and guarantees access to every OpenClaw setting from the Web UI.

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
- Disabling the Windows WinINET proxy does not remove proxy variables explicitly embedded in the WSL systemd unit. After the localhost proxy listener disappears, unset `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, and `https_proxy` at the service boundary and verify the real gateway process environment plus an endpoint-level QQBot WebSocket connection.
- Agy model versions must not be duplicated across source, manifest, tests, runtime defaults, and cron payloads. The Agy model-directory Module now reads `agy models`, selects the latest numeric Gemini Flash/Pro family, and exposes stable `agy/flash` and `agy/pro` Interfaces.
- Agy thinking variants must come from the discovered CLI rows. The Adapter only constructs a variant that was reported; `off`/`minimal` map to the lowest discovered level and `xhigh`/`max` to the highest. A persisted runtime snapshot is the fallback Seam when live discovery is temporarily unavailable.
- `agy models` output may use either slug ids or human-readable names such as `Gemini 3.6 Flash (High)`. Preserve the exact reported executable name; do not reconstruct it from the display family.
- Generic CLI discovery must use the same effective `agents.defaults.cliBackends.agy` command/env and caller workspace as execution. Plugin-specific command/cwd/env belongs only to the custom stream Adapter.
- The provider stream factory may receive a runtime config object without plugin entries. Merge its parsed values over the plugin startup config so Agy-specific proxy/cwd/command settings are not silently dropped at inference time.
- Keep the server gateway globally direct for QQBot. Host-exec security rejects proxy-variable overrides from CLI backend config, so the server routes only Agy through a dedicated wrapper that loads `100.113.70.121:7897`; the gateway and QQBot inherit no global proxy.

## Control Center Web UI

- Open-source preflight compared Open WebUI, ClawPort, mudrii/openclaw-dashboard, Silos, and other OpenClaw dashboards. ClawPort was the strongest directly relevant visual/information-architecture reference (MIT, roughly 900 stars), while Open WebUI had much higher adoption but primarily solved chat and carried branding/license constraints unsuitable for a deeply customized OpenClaw control plane.
- Do not replace OpenClaw's native Control UI backend with a second dashboard service. The native gateway already owns authentication, live `config.schema`, plugin schema merging, validation, secret redaction, config save/apply, and restart semantics. A separate CLI/file-editing backend would duplicate security-sensitive behavior and would inevitably lag new config keys.
- The settings landing page now acts as a Control Center. It combines polished glass/card presentation with direct access to models, channels, security, automations, identities, appearance, bootstrap profiles, custom-fork capabilities, and complete configuration coverage.
- The Power Features card exposes Agy dynamic-model support, its `systemPromptMode` selector, main-session program-delivery cron counts/management, and QA Lab enablement/details.
- Complete Web UI coverage uses three layers: the live schema-driven form, dynamically merged plugin schemas, and a raw JSON editor. This means new core/plugin settings remain editable without hand-building a dedicated form for every future key.
- Custom-feature quick controls only stage changes in the canonical config draft. Existing Save Changes / Apply Now actions remain the single commit path, preserving validation and gateway reload behavior.
- Relevant validation: four UI unit suites passed (60 tests), the production Vite build passed, and modified files passed `oxfmt` plus `git diff --check`. The broader UI TypeScript gate still reports two pre-existing `packages/net-policy/src/ip.ts` union mismatches for `benchmarking` and `orchid2`, unrelated to this UI change.
- Control Center commit `5e7131ad6acc5de490d8502663e038122faf6496` was pushed to `origin/fix/qa-lab-private-sdk-build`, then the server WSL checkout was fast-forwarded to it.
- Server deployment passed `OPENCLAW_BUILD_PRIVATE_QA=1 corepack pnpm build`, emitted the Control Center asset plus Agy and private QA dist entries, restarted `openclaw-gateway.service`, and verified a clean repository, active service, HTTP 200 Control UI, `{"ok":true,"status":"live"}`, and a connected QQBot WebSocket.
- Existing post-deploy warnings say the separately installed `qqbot` and `zai` packages advertise plugin API `>=2026.7.1` while this host advertises `2026.6.10`. The bundled QQBot still loaded and connected; no unrelated global/package upgrade was performed.
- Follow-up diagnosis after the user opened `/chat`: the deployed bundle was current (`index-BIxyV0ne.js`) and contained the Control Center strings, but the earlier implementation only rendered the redesign on `/config`. Calling that a new Web UI was a scope error; `/chat` had intentionally unchanged markup and styling.
- The follow-up Command Center redesign now reaches the actual chat route. It adds an active-workspace command deck with connection/message/reasoning telemetry and search, refresh, focus, and new-session actions; it also gives the global shell, navigation, transcript, message bubbles, composer, and workspace rail one responsive visual system.
- Regression coverage now asserts that the chat command deck renders on the real `renderChat` seam and that its primary callbacks work. The focused chat/config suites pass 136 tests, modified files pass formatting/diff checks, and the production Control UI build succeeds.
- Commit `074283fe2a1207c72a6a211413b3cde57c9d7876` was pushed and deployed. The server completed the private QA build in 292.5 seconds, emitted `index-WOWhasPM.js` plus `index-Bw1sGivB.css`, passed explicit JS/CSS checks for `chat-command-deck`, and restarted cleanly.
- The exact user-reported `/chat?session=agent%3Amain%3Adashboard%3Ad6b7230d-a5f7-42b2-b18b-674fc4712116` route was opened in the authenticated Chrome session after deployment. DOM and screenshot verification showed the 76px active-workspace deck, connected/message telemetry, command actions, rounded shell, grid transcript, updated bubbles, and elevated composer. Gateway health was live, HTTP was 200, Agy and QA Lab dist were present, and QQBot reconnected with HTTP 200 plus an active WebSocket.

## Complete Simplified Chinese localization

- The Control UI now routes the visible copy in the shell, chat, agents, channels, settings/config forms, cron, Dreaming, MCP, nodes, sessions, Skill Workshop, Skills, usage, workboard, dialogs, tool cards, and status/empty-state helpers through the existing i18n system.
- Source English copy lives in `ui/src/i18n/locales/en-raw-ui.ts`; the official generator emits every locale and maintains translation-memory metadata. Simplified Chinese text was translated and placeholder-validated with Agy `gemini-3.6-flash-high`.
- Top-level label maps use getters so a locale change updates already-imported modules instead of freezing English during module evaluation.
- The raw-copy audit now ignores only the two intentional slash-command icon/category enum values `book` and `tools`. On Windows the generator invokes the local Oxfmt Node entrypoint directly, avoiding pnpm's non-TTY module-purge prompt and the resulting `write EOF`.
- Authenticated Chrome QA on the exact user-reported chat route caught a second layer of runtime-only residuals: translated navigation IDs produced `nav.聊天`-style keys, while relative timestamps, role fallbacks, Markdown-copy actions, voice controls, thinking levels, and the light theme still contained English or awkward mixed-language labels. Navigation IDs are now stable internal values again, and every visible label uses a dedicated translation key.
- A final authenticated reload found the dashboard-header breadcrumb had rendered once in English before the saved locale finished loading. The header now owns an `I18nController`, rerenders when the locale becomes ready, and has a component regression test covering `Chat` → `聊天`.
- Final i18n report: 2626/2626 Simplified Chinese keys filled with zero Chinese fallbacks. The raw-copy baseline contains only the four stable internal navigation identifiers `chat`, `control`, `agent`, and `settings`; they are translated at render time and are not visible English copy.
- Focused localization, chat, navigation, time-format, and app-render tests pass (255/255 plus 75/75); the final header/localization/navigation regression set passes 39/39; and the production Vite build succeeds. The broader UI gate still has the pre-existing Vite alias test plus the two `packages/net-policy/src/ip.ts` enum errors; Playwright's downloaded Chromium is absent on this Windows checkout.

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
- [x] Deploy the private QA build fix, enable the private QA runtime alias, and verify a clean cold gateway start.
- [x] Remove stale service-level localhost proxy variables and verify QQBot reconnects with HTTP 200 and an active WebSocket.
- [x] Upgrade the server's concrete Agy Flash model and all explicit cron references from 3.5 to 3.6.
- [x] Replace Agy version hardcoding with a live model-directory Module and stable `agy/flash` / `agy/pro` references.
- [x] Deploy the dynamic Agy catalog, persist the current 3.6 discovery snapshot, and migrate the server default plus all explicit cron model references to `agy/flash`.
- [x] Route only Agy through the reachable Tailscale proxy, refresh its WSL credential, and verify model discovery plus a Gemini 3.6 Flash inference.
- [x] Research maintained OpenClaw dashboards and select a compatible UI direction.
- [x] Add a polished Control Center settings landing page.
- [x] Surface Agy prompt handling, program-delivery cron status, and QA Lab controls in the Web UI.
- [x] Add explicit schema-form, plugin-settings, and raw-JSON access so every OpenClaw setting remains editable.
- [x] Add focused UI tests and complete a production Control UI build.
- [x] Commit and push the Control Center Web UI.
- [x] Deploy the Control Center Web UI to the server WSL gateway and verify service health.
- [x] Reproduce the user's unchanged `/chat` UI and identify the settings-only scope error.
- [x] Add the Command Center shell and active-workspace deck to the real chat route.
- [x] Restyle navigation, transcript, message bubbles, composer, and workspace rail responsively.
- [x] Add chat-route regression coverage and complete a production Control UI build.
- [x] Commit and push the full chat/shell redesign.
- [x] Deploy the full chat/shell redesign and visually verify the user's `/chat` URL.
- [x] Audit and migrate visible Control UI copy to the i18n system.
- [x] Translate all Simplified Chinese locale entries with Agy Gemini 3.6 Flash High.
- [x] Fix dynamic top-level translations, single/plural rendering, and Chinese-locale test assumptions.
- [x] Fix the Windows i18n formatter invocation and slash-command enum false positives.
- [x] Verify zero zh-CN fallbacks, focused tests, generator tests, formatting, and production UI build.
- [x] Commit, push, deploy, and visually verify the fully localized `/chat` route.
