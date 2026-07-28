import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionEntry } from "../../config/sessions/types.js";
import type { HandleCommandsParams } from "./commands-types.js";

const modeMocks = vi.hoisted(() => ({
  performGatewaySessionReset: vi.fn(),
}));

vi.mock("../../gateway/server-methods/sessions.runtime.js", () => ({
  performGatewaySessionReset: modeMocks.performGatewaySessionReset,
}));

import { handleModeCommand, parseModeCommand } from "./commands-mode.js";
import { parseInlineDirectives } from "./directive-handling.parse.js";

function commandParams(entry: SessionEntry): HandleCommandsParams {
  const sessionKey = "agent:main:qq:owner";
  return {
    ctx: { CommandAuthorized: true, CommandSource: "qq", Provider: "qqbot" },
    cfg: {},
    command: {
      surface: "text",
      channel: "qqbot",
      ownerList: ["owner"],
      senderIsOwner: true,
      isAuthorizedSender: true,
      senderId: "owner",
      rawBodyNormalized: "/mode professional",
      commandBodyNormalized: "/mode professional",
    },
    directives: parseInlineDirectives(""),
    elevated: { enabled: false, allowed: false, failures: [] },
    sessionEntry: entry,
    sessionStore: { [sessionKey]: entry },
    sessionKey,
    storePath: "sessions.json",
    workspaceDir: "workspace",
    defaultGroupActivation: () => "always",
    resolvedVerboseLevel: "off",
    resolvedReasoningLevel: "off",
    resolveDefaultThinkingLevel: async () => undefined,
    provider: "agy",
    model: "flash",
    contextTokens: 128_000,
    isGroup: false,
  };
}

describe("parseModeCommand", () => {
  afterEach(() => {
    modeMocks.performGatewaySessionReset.mockReset();
  });

  it("parses Life and Professional aliases", () => {
    expect(parseModeCommand("/mode life")).toEqual({ matched: true, target: "life" });
    expect(parseModeCommand("/mode 生活")).toEqual({ matched: true, target: "life" });
    expect(parseModeCommand("/mode professional")).toEqual({
      matched: true,
      target: "professional",
    });
    expect(parseModeCommand("/mode 工作")).toEqual({
      matched: true,
      target: "professional",
    });
  });

  it("uses a bare command as status and rejects unknown modes", () => {
    expect(parseModeCommand("/mode")).toEqual({ matched: true });
    expect(parseModeCommand("/mode status")).toEqual({ matched: true });
    expect(parseModeCommand("/mode hybrid")).toEqual({
      matched: true,
      invalid: "hybrid",
    });
    expect(parseModeCommand("/model life")).toEqual({ matched: false });
  });

  it("rotates the QQ session into Professional Core while preserving shared model resolution", async () => {
    const entry: SessionEntry = { sessionId: "life-session", updatedAt: 1 };
    const params = commandParams(entry);
    const switchedEntry: SessionEntry = {
      sessionId: "professional-session",
      updatedAt: 2,
      conversationCoreId: "professional",
    };
    modeMocks.performGatewaySessionReset.mockResolvedValue({
      ok: true,
      key: params.sessionKey,
      agentId: "main",
      entry: switchedEntry,
      resolved: { modelProvider: "agy", model: "flash" },
      storePath: params.storePath,
    });

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("Switched to Professional mode");
    expect(result?.reply?.text).toContain("agy/flash");
    expect(modeMocks.performGatewaySessionReset).toHaveBeenCalledWith(
      expect.objectContaining({
        key: params.sessionKey,
        conversationCoreId: "professional",
      }),
    );
    expect(entry).toMatchObject({
      sessionId: "professional-session",
      conversationCoreId: "professional",
    });
  });

  it("explicitly binds a legacy row when /mode life is requested", async () => {
    const entry: SessionEntry = { sessionId: "legacy-session", updatedAt: 1 };
    const params = commandParams(entry);
    params.command.commandBodyNormalized = "/mode life";
    modeMocks.performGatewaySessionReset.mockResolvedValue({
      ok: true,
      key: params.sessionKey,
      agentId: "main",
      entry: {
        sessionId: "fresh-life-session",
        updatedAt: 2,
        conversationCoreId: "life",
      },
      resolved: { modelProvider: "openai", model: "gpt-5" },
      storePath: params.storePath,
    });

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("Switched to Life mode");
    expect(modeMocks.performGatewaySessionReset).toHaveBeenCalledWith(
      expect.objectContaining({ conversationCoreId: "life" }),
    );
    expect(entry).toMatchObject({
      sessionId: "fresh-life-session",
      conversationCoreId: "life",
    });
  });

  it("reports the shared model without resetting when Professional mode is already selected", async () => {
    const entry: SessionEntry = {
      sessionId: "professional-session",
      updatedAt: 1,
      conversationCoreId: "professional",
      spawnedCwd: "/work/project",
    };
    const params = commandParams(entry);

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("Already in Professional mode");
    expect(result?.reply?.text).toContain("agy/flash");
    expect(modeMocks.performGatewaySessionReset).not.toHaveBeenCalled();
  });

  it("reports a lifecycle reset failure without changing the current core", async () => {
    const entry: SessionEntry = {
      sessionId: "life-session",
      updatedAt: 1,
      conversationCoreId: "life",
    };
    const params = commandParams(entry);
    modeMocks.performGatewaySessionReset.mockResolvedValue({
      ok: false,
      error: { code: "UNAVAILABLE", message: "session reset unavailable" },
    });

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("Mode switch failed");
    expect(entry).toMatchObject({
      sessionId: "life-session",
      conversationCoreId: "life",
    });
  });
});
