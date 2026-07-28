# ADR 0001: Isolate conversation cores above prompt construction

- Status: Accepted
- Date: 2026-07-28

## Context

The same OpenClaw installation must support personal/life conversations and professional project work. These modes need the same QQ and Gateway delivery shell, but must not share identity, prompt assembly, native history, workspace, or memory.

OpenClaw already has model discovery and multiple runtime adapters, including the configured `agy` CLI backend. Duplicating that stack would create a second model catalog and authentication system without improving context isolation.

## Decision

Introduce a product-level `Conversation Core` binding on every new session lifecycle.

- `life` uses the existing embedded OpenClaw runtime.
- `professional` uses the same OpenClaw model catalog and execution adapters, but resolves a different isolated core workspace before prompt, history, or memory construction.
- Selecting an `agy` model in either core uses the existing `agy` CLI authentication and execution path.
- Professional Core has an isolated workspace under the agent state directory. Its `AGENTS.md`,
  identity/context files, transcript, and memory belong only to that core.
- `/mode life`, `/mode professional`, and `/mode status` are available on text channels such as QQ.
- Switching cores rotates the session lifecycle while preserving an explicit user model selection.
- `/model` and the new-session model picker expose the same OpenClaw model catalog in both cores.

The delivery shell and model runtime are shared infrastructure. Identity, transcript, workspace, bootstrap files, and durable memory are not shared.

## Consequences

- One OpenClaw program and channel configuration can expose two genuinely separate agent modes.
- Core selection becomes visible in the session API and new-session UI.
- Existing sessions without an explicit core remain Life Core sessions.
- Existing legacy ACP-bound rows continue to run for compatibility.
- Same-core Professional forks use the normal OpenClaw transcript fork path; cross-core forks fail.
- Professional Core requires no Claude/ACPX configuration or second authentication stack.

## Rejected alternatives

- **Prompt-only persona switch:** leaks existing history and memory into the new mode.
- **Run both architectures inside one turn:** makes ownership and fallback ambiguous.
- **Claude-only ACPX runtime:** creates a second model catalog and authentication stack and prevents reuse of the user's existing `agy` CLI configuration.
- **Separate program/configuration:** duplicates channel setup and makes switching from QQ unnecessarily difficult.
- **Silent fallback to Life Core:** violates isolation exactly when Professional Core is unhealthy.
