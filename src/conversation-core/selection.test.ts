import { describe, expect, it } from "vitest";
import type { AcpSessionResolution } from "../acp/control-plane/manager.types.js";
import {
  assertConversationCoreForkCompatible,
  resolveConversationCoreRunPlan,
} from "./selection.js";

function readyResolution(): Extract<AcpSessionResolution, { kind: "ready" }> {
  return {
    kind: "ready",
    sessionKey: "agent:main:dashboard:professional",
    meta: {} as Extract<AcpSessionResolution, { kind: "ready" }>["meta"],
  };
}

describe("conversation core selection", () => {
  it("keeps legacy rows on Life Core and the embedded OpenClaw runtime", () => {
    expect(
      resolveConversationCoreRunPlan({
        entry: {},
        acpResolution: { kind: "none", sessionKey: "agent:main:main" },
        rawModelRun: false,
      }),
    ).toEqual({ coreId: "life", implementation: "openclaw" });
  });

  it("routes an explicitly bound Professional session through shared OpenClaw model execution", () => {
    expect(
      resolveConversationCoreRunPlan({
        entry: { conversationCoreId: "professional" },
        acpResolution: { kind: "none", sessionKey: "agent:main:dashboard:professional" },
        rawModelRun: false,
      }),
    ).toEqual({
      coreId: "professional",
      implementation: "openclaw",
    });
  });

  it("ignores legacy Professional ACP state and keeps the isolated OpenClaw path", () => {
    expect(
      resolveConversationCoreRunPlan({
        entry: { conversationCoreId: "professional" },
        acpResolution: readyResolution(),
        rawModelRun: false,
      }),
    ).toEqual({
      coreId: "professional",
      implementation: "openclaw",
    });
  });

  it("supports raw model runs without crossing into Life Core", () => {
    expect(
      resolveConversationCoreRunPlan({
        entry: { conversationCoreId: "professional" },
        acpResolution: { kind: "none", sessionKey: "agent:main:dashboard:professional" },
        rawModelRun: true,
      }),
    ).toEqual({
      coreId: "professional",
      implementation: "openclaw",
    });
  });

  it("does not let an explicit Life session inherit a native binding", () => {
    expect(() =>
      resolveConversationCoreRunPlan({
        entry: { conversationCoreId: "life" },
        acpResolution: readyResolution(),
        rawModelRun: false,
      }),
    ).toThrow(/incompatible/i);
  });

  it("rejects cross-core forks", () => {
    expect(() =>
      assertConversationCoreForkCompatible({
        parent: { conversationCoreId: "professional" },
        requested: "life",
      }),
    ).toThrow(/cannot fork across conversation cores/i);
  });
});
