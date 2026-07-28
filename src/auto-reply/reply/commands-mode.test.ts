import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionEntry } from "../../config/sessions/types.js";
import type { HandleCommandsParams } from "./commands-types.js";

const modeMocks = vi.hoisted(() => ({
  initializeProfessionalCoreSession: vi.fn(),
  performGatewaySessionReset: vi.fn(),
}));

vi.mock("../../conversation-core/professional.js", () => ({
  initializeProfessionalCoreSession: modeMocks.initializeProfessionalCoreSession,
}));

vi.mock("../../gateway/server-methods/sessions.runtime.js", () => ({
  performGatewaySessionReset: modeMocks.performGatewaySessionReset,
}));

import { handleModeCommand, parseModeCommand } from "./commands-mode.js";

function commandParams(entry: SessionEntry): HandleCommandsParams {
  const sessionKey = "agent:main:qq:owner";
  return {
    ctx: { CommandAuthorized: true, CommandSource: "qq", Provider: "qqbot" },
    cfg: {},
    command: {
      surface: "qq",
      channel: "qqbot",
      ownerList: ["owner"],
      senderIsOwner: true,
      isAuthorizedSender: true,
      senderId: "owner",
      rawBodyNormalized: "/mode professional",
      commandBodyNormalized: "/mode professional",
    },
    directives: {},
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
    provider: "openai",
    model: "gpt-5",
    contextTokens: 128_000,
    isGroup: false,
  };
}

describe("parseModeCommand", () => {
  afterEach(() => {
    modeMocks.initializeProfessionalCoreSession.mockReset();
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

  it("rotates the QQ session and initializes Professional Core", async () => {
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
      resolved: { modelProvider: "anthropic", model: "claude" },
      storePath: params.storePath,
    });
    modeMocks.initializeProfessionalCoreSession.mockResolvedValue(undefined);

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("Switched to Professional mode");
    expect(modeMocks.performGatewaySessionReset).toHaveBeenCalledWith(
      expect.objectContaining({
        key: params.sessionKey,
        conversationCoreId: "professional",
      }),
    );
    expect(modeMocks.initializeProfessionalCoreSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: params.sessionKey,
        agentId: "main",
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
    expect(modeMocks.initializeProfessionalCoreSession).not.toHaveBeenCalled();
    expect(entry).toMatchObject({
      sessionId: "fresh-life-session",
      conversationCoreId: "life",
    });
  });

  it("revalidates the native session when Professional mode is already selected", async () => {
    const entry: SessionEntry = {
      sessionId: "professional-session",
      updatedAt: 1,
      conversationCoreId: "professional",
      spawnedCwd: "/work/project",
    };
    const params = commandParams(entry);
    modeMocks.initializeProfessionalCoreSession.mockResolvedValue(undefined);

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("isolated native session is ready");
    expect(modeMocks.performGatewaySessionReset).not.toHaveBeenCalled();
    expect(modeMocks.initializeProfessionalCoreSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: params.sessionKey,
        agentId: "main",
        cwd: "/work/project",
      }),
    );
  });

  it("rolls back to the previous core when Professional initialization fails", async () => {
    const entry: SessionEntry = {
      sessionId: "life-session",
      updatedAt: 1,
      conversationCoreId: "life",
    };
    const params = commandParams(entry);
    modeMocks.performGatewaySessionReset
      .mockResolvedValueOnce({
        ok: true,
        key: params.sessionKey,
        agentId: "main",
        entry: {
          sessionId: "professional-session",
          updatedAt: 2,
          conversationCoreId: "professional",
        },
        resolved: { modelProvider: "anthropic", model: "claude" },
        storePath: params.storePath,
      })
      .mockResolvedValueOnce({
        ok: true,
        key: params.sessionKey,
        agentId: "main",
        entry: {
          sessionId: "life-rollback",
          updatedAt: 3,
          conversationCoreId: "life",
        },
        resolved: { modelProvider: "openai", model: "gpt-5" },
        storePath: params.storePath,
      });
    modeMocks.initializeProfessionalCoreSession.mockRejectedValue(new Error("ACP unavailable"));

    const result = await handleModeCommand(params, true);

    expect(result?.reply?.text).toContain("rolled back to Life mode");
    expect(modeMocks.performGatewaySessionReset).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ conversationCoreId: "life" }),
    );
    expect(entry).toMatchObject({
      sessionId: "life-rollback",
      conversationCoreId: "life",
    });
  });
});
