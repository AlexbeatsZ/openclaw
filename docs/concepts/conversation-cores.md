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
- **Professional Core** is a native Claude work session managed through ACPX. It has a separate identity, native history, workspace, and durable memory.

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

A switch starts a fresh session lifecycle for the target core. The QQ conversation key stays usable, while the old core's native history, memory, and model/auth selection remain isolated.

Sending `/mode professional` again while Professional Core is already selected revalidates its native session. This is useful after fixing ACPX availability or Claude authentication.

If Professional Core cannot initialize, OpenClaw reports the failure and attempts to return the conversation to its previous core. It never silently handles the request with Life Core.

## Professional Core requirements

Professional Core requires:

- ACP enabled in OpenClaw,
- a healthy ACPX backend,
- the `claude` ACP agent allowed by policy,
- valid Claude authentication in the Gateway service environment.

Professional Core owns its native model and session. Do not select a normal OpenClaw model or catalog runtime for a Professional session.

## Memory behavior

Life memory remains in the normal agent workspace. Professional memory lives under its isolated core workspace. Neither core automatically imports or exposes the other core's memory.

Memory recall is supporting context, not conversation content. The agent should apply relevant memories silently and mention prior history only when the user asks, when it materially changes the answer, when current input conflicts with memory, or when verification is important.

## Current limits

- Sessions cannot be forked across cores.
- Professional sessions cannot be forked until the native ACP runtime can fork its own history.
- Existing sessions created before core binding are treated as Life Core sessions. Existing ACP-bound legacy sessions remain compatible with their prior behavior.
