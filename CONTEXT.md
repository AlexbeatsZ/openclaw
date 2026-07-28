# Domain Context

OpenClaw is the delivery shell: it owns channels, routing, authorization, delivery, and the Gateway API. A conversation core owns the identity, prompt/history construction, workspace, memory, and runtime for one session lifecycle.

## Core terms

- **Conversation Core** — The product-level execution boundary selected before prompt, history, or memory construction.
- **Life Core** — The existing OpenClaw agent runtime. It uses the agent workspace, OpenClaw bootstrap files, memory tools, plugins, compaction, and model selection.
- **Professional Core** — A separate native professional-work runtime. Version 1 uses a persistent Claude ACP session through the ACPX backend and an isolated core workspace.
- **Delivery Shell** — Shared OpenClaw channel and Gateway infrastructure. It may project messages for display, but it does not make one core's transcript the other core's native history.
- **Core Workspace** — Identity and durable-memory storage owned by one core.
- **Task Working Directory** — Project files selected for a professional session. It is not identity or memory storage.
- **Mode Switch** — A user-requested core change. It rotates the session lifecycle and native runtime binding; it is never an in-place prompt/persona toggle.

## Invariants

- A session lifecycle is pinned to exactly one conversation core.
- Life and Professional identity, history, workspace, and durable memory never cross implicitly.
- Professional Core bypasses OpenClaw embedded prompt/bootstrap/memory construction.
- A missing Professional native runtime fails closed; it never falls back to Life Core.
- Cross-core forks are rejected. Professional forks are also rejected until the native runtime can fork its own history.
- Recall is not disclosure: relevant memory may shape an answer silently, but unrelated history is not volunteered.

## Main code boundaries

- Core identity and selection: `src/conversation-core/`
- High-level dispatch seam: `src/agents/agent-command.ts`
- Session lifecycle ownership: `src/gateway/session-create-service.ts` and `src/gateway/session-reset-service.ts`
- Chat switch command: `src/auto-reply/reply/commands-mode.ts`
- New-session selection: `ui/src/pages/new-session/`
