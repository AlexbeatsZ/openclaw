---
summary: "Run separate Life and Professional conversation cores through one OpenClaw delivery shell"
title: "Conversation cores"
read_when:
  - You want separate personal and professional agent modes
  - You need to understand /mode or Professional Core isolation
---

# Conversation cores

OpenClaw can route one channel conversation through one of two isolated cores:

- **Life Core** is the normal OpenClaw agent. It uses the configured agent workspace, OpenClaw memory, plugins, compaction, and model selection.
- **Professional Core** uses the same OpenClaw model catalog and execution adapters, but has a separate identity, transcript, workspace, bootstrap files, and durable memory.

Both cores reuse OpenClaw for QQ and other channel delivery, authorization, and the Gateway API. They do not combine their prompt or memory architectures.

## Switch from chat

Send one of these commands in an authorized conversation:

```text
/mode status
/mode life
/mode professional
```

Chinese aliases are accepted:

```text
/mode 生活
/mode 工作
```

A switch starts a fresh session lifecycle for the target core. The QQ conversation key stays usable, while the old core's history and memory remain isolated.

An explicit model selection is preserved when switching modes. This makes `/mode` a context switch rather than a model or account switch.

## Shared model selection

Both cores use the models already exposed by OpenClaw:

```text
/model
/model agy/flash
```

If the selected provider is `agy`, both modes use the configured `agy` CLI backend and its existing authentication. Professional Core does not require Claude, ACPX, or a separate model list. External native-session catalogs remain unavailable for Professional Core because their history ownership would bypass core isolation.

## Memory behavior

Life memory remains in the normal agent workspace. Professional memory lives under its isolated core workspace. Neither core automatically imports or exposes the other core's memory.

Memory recall is supporting context, not conversation content. The agent should apply relevant memories silently and mention prior history only when the user asks, when it materially changes the answer, when current input conflicts with memory, or when verification is important.

## Current limits

- Sessions cannot be forked across cores.
- Professional sessions can be forked within Professional Core through the normal transcript fork path.
- Existing sessions created before core binding are treated as Life Core sessions. Existing ACP-bound legacy sessions remain compatible with their prior behavior.
