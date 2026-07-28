# ADR 0001: Isolate conversation cores above prompt construction

- Status: Accepted
- Date: 2026-07-28

## Context

The same OpenClaw installation must support personal/life conversations and professional project work. These modes need the same QQ and Gateway delivery shell, but must not share identity, prompt assembly, native history, workspace, or memory.

OpenClaw already has low-level harness and ACP capabilities. Selecting a model or harness after OpenClaw has loaded bootstrap and memory files is too late to provide real isolation.

## Decision

Introduce a product-level `Conversation Core` binding on every new session lifecycle.

- `life` uses the existing embedded OpenClaw runtime.
- `professional` uses a persistent native Claude ACP session through the ACPX backend.
- Dispatch occurs after common delivery preparation but before embedded OpenClaw session preparation.
- Professional Core has an isolated workspace under the agent state directory. Its identity/context
  files become the native Claude session system prompt, while each user turn passes through unchanged.
- `/mode life`, `/mode professional`, and `/mode status` are available on text channels such as QQ.
- Switching cores rotates the session lifecycle and discards incompatible ACP state.
- Professional initialization failures are reported and rolled back; no cross-core fallback is permitted.

Gateway transcripts remain a display and delivery projection. They are not the Professional Core's native history.

## Consequences

- One OpenClaw program and channel configuration can expose two genuinely separate agent modes.
- Core selection becomes visible in the session API and new-session UI.
- Existing sessions without an explicit core remain Life Core sessions.
- Existing legacy ACP-bound rows continue to run for compatibility.
- Cross-core forks fail. Professional-to-Professional forks also fail until ACP exposes a history-preserving fork primitive.
- Professional Core availability depends on ACP being enabled, ACPX being healthy, the `claude` agent being allowed, and Claude authentication being valid.

## Rejected alternatives

- **Prompt-only persona switch:** leaks existing history and memory into the new mode.
- **Run both architectures inside one turn:** makes ownership and fallback ambiguous.
- **Import Harness directly:** its current filesystem/runtime assumptions are not a stable OpenClaw integration boundary.
- **Silent fallback to Life Core:** violates isolation exactly when Professional Core is unhealthy.
