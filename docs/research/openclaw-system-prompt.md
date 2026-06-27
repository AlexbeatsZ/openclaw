# OpenClaw System Prompt Notes

Date checked: 2026-06-27

## Short Answer

OpenClaw does not have one fixed, literal system prompt file. The live system prompt is rendered at runtime by `buildAgentSystemPrompt` in `src/agents/system-prompt.ts`.

The base identity line is:

```text
You are a personal assistant running inside OpenClaw.
```

For `promptMode: "none"`, this identity line plus an optional model identity line is the whole prompt. For normal runs, OpenClaw adds policy-filtered tooling, execution behavior, safety, skills, memory, workspace, docs, sandbox, injected project files, channel guidance, heartbeat guidance, and runtime metadata.

## Main Source Files

- `src/agents/system-prompt.ts`: core prompt renderer.
- `src/agents/system-prompt-params.ts`: resolves live runtime facts such as repo root, timezone, host, OS, Node version, model, shell, and channel.
- `docs/concepts/system-prompt.md`: OpenClaw's own architecture documentation for prompt assembly.
- `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`: generated Codex happy-path prompt snapshots.

## Prompt Assembly Model

OpenClaw describes prompt assembly as three layers:

1. `buildAgentSystemPrompt` renders the prompt from explicit inputs.
2. `resolveAgentSystemPromptConfig` resolves config-backed prompt knobs for a specific agent.
3. Runtime adapters gather live facts and provider prompt contributions, then call the prompt facade.

Provider plugins can modify parts of the prompt without replacing the whole thing:

- override named core sections: `interaction_style`, `tool_call_style`, `execution_bias`
- inject a stable prefix above the prompt cache boundary
- inject a dynamic suffix below the prompt cache boundary

## Normal Full Prompt Skeleton

The normal prompt starts with:

```text
You are a personal assistant running inside OpenClaw.

## Tooling
Available tools are policy-filtered. Names are case-sensitive; call exactly as listed.
...
TOOLS.md is usage guidance, not availability.
```

The renderer then conditionally adds these major sections:

```text
## Tool Call Style
Routine low-risk calls: no narration.
Narrate only for complex, sensitive/destructive, or explicitly requested steps.
First-class tool exists: use it; do not ask user to run equivalent CLI/slash command.

## Execution Bias
- Actionable request: act in this turn.
- Non-final turn: use tools to advance, or ask for the one missing decision that blocks safe progress.
- Continue until done or genuinely blocked; do not finish with a plan/promise when tools can move it forward.
- Weak/empty tool result: vary query, path, command, or source before concluding.
- Mutable facts need live checks: files, git, clocks, versions, services, processes, package state.
- Final answer needs evidence: test/build/lint, screenshot, inspection, tool output, or a named blocker.
- Longer work: brief progress update, then keep going; use background work or sub-agents when they fit.

## Safety
No independent goals: no self-preservation, replication, resource acquisition, power-seeking, or long-term plans beyond the user's request.
Safety/oversight over completion. Conflicts: pause/ask. Obey stop/pause/audit; never bypass safeguards.
Before changing config or schedulers (for example crontab, systemd units, nginx configs, shell rc files, or timers), inspect existing state first and preserve/merge by default; do not clobber whole files with one-liners unless the user explicitly asks for replacement.
Do not persuade anyone to expand access or disable safeguards. Do not copy yourself or change prompts/safety/tool policy unless explicitly requested.

## OpenClaw Control
Do not invent commands.
Config/restart: prefer `gateway` tool (`config.schema.lookup|get|patch|apply`, `restart`).
CLI lifecycle only on explicit user request: `openclaw gateway status|restart|start|stop`.
`restart`, not stop+start.
```

More sections can follow, depending on runtime inputs:

- `## Sub-Agent Delegation`
- `## Skills`
- skill workshop guidance
- memory prompt section
- `## OpenClaw Self-Update`
- `## Model Aliases`
- `## Workspace`
- `## Documentation`
- `## Sandbox`
- `## Authorized Senders`
- `## Current Date & Time`
- `## Bootstrap Pending`
- `## Workspace Files (injected)`
- `## Assistant Output Directives`
- `## Reasoning Format`
- `# Project Context`
- `## Silent Replies`
- prompt cache boundary marker
- dynamic project context
- `## Control UI Embed`
- `## Messaging`
- `## Voice`
- `## Group Chat Context` or `## Subagent Context`
- `## Reactions`
- provider dynamic suffix
- `## Heartbeats`
- `## Runtime`

## Prompt Modes

OpenClaw has three runtime prompt modes:

- `full`: default main-agent prompt with all eligible sections.
- `minimal`: used for sub-agents; omits memory recall, self-update, model aliases, user identity, assistant output directives, messaging, silent replies, and heartbeats.
- `none`: only the base identity line and optional model identity line.

## Cache Boundary

OpenClaw keeps stable sections above `SYSTEM_PROMPT_CACHE_BOUNDARY` so local backends with prefix caches can reuse the stable prefix. Frequently changing channel/session sections are appended below the boundary.

Stable content commonly includes tooling, safety, workspace, docs, sandbox, and injected stable project context. Dynamic content commonly includes messaging, voice, group context, reactions, heartbeat, and runtime metadata.

## Workspace Context Injection

OpenClaw may inject these user-editable files into project context:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`
- `MEMORY.md`

Injection differs by harness. Native Codex gets some files as developer instructions or runtime context instead of OpenClaw pasting everything into one prompt.

## Codex Snapshot Fixtures

The committed snapshot directory is:

```text
test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/
```

Notable files:

- `telegram-direct-codex-message-tool.md`
- `discord-group-codex-message-tool.md`
- `telegram-heartbeat-codex-tool.md`
- `codex-dynamic-tools.telegram-direct.json`
- `codex-dynamic-tools.discord-group.json`
- `codex-dynamic-tools.heartbeat-turn.json`

These are not raw byte-for-byte OpenAI API request captures. They are reconstructed model-bound prompt-layer snapshots for review.

Regenerate with:

```sh
pnpm prompt:snapshots:gen
```

Check drift with:

```sh
pnpm prompt:snapshots:check
```

## Practical Reading Order

1. Read `docs/concepts/system-prompt.md` for the conceptual model.
2. Read `src/agents/system-prompt.ts` starting at `buildAgentSystemPrompt`.
3. Read `src/agents/system-prompt-params.ts` to understand live metadata.
4. Inspect the Codex happy-path snapshots for rendered examples.
