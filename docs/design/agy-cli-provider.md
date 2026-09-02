# Agy CLI Provider

## Ownership

The Agy integration is a bundled provider plugin under `extensions/agy`. It
uses only public `openclaw/plugin-sdk/*` entrypoints. Operator configuration is
owned by `plugins.entries.agy.config`; the removed
`agents.defaults.cliBackends.agy` shape must not be restored.

## Model Discovery

The plugin runs `agy models`, recognizes available Gemini Flash and Pro
variants, and exposes stable `agy/flash` and `agy/pro` aliases. Discovery uses
the same effective command, environment, workspace, timeout, and output limits
as execution. A persisted dynamic snapshot is a temporary fallback when live
discovery becomes unavailable.

The selected OpenClaw thinking level maps to both the discovered concrete model
variant and Agy's required `--effort low|medium|high` argument.

## System Prompt Transport

Agy has one prompt channel and no native system-prompt flag. The generic CLI
backend contract therefore supports `systemPromptTransport: "prompt-prefix"`.
The host strips its internal cache boundary and prefixes the transformed system
instructions to the user prompt before spawning Agy.

The Agy transform removes OpenClaw-only tooling sections because Agy owns its
native tools. Do not drop the prompt-prefix transport merely to satisfy a newer
CLI backend type: doing so silently removes system instructions.

## Dependency Boundary

Runtime dependencies such as `strip-ansi` belong to the Agy package manifest,
not the repository root. The plugin must continue to pass the extension runtime
dependency and package-manifest contracts.
