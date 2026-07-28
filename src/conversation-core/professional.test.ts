import { beforeEach, describe, expect, it, vi } from "vitest";

const professionalMocks = vi.hoisted(() => ({
  initializeSession: vi.fn(),
  closeSession: vi.fn(),
  ensureProfessionalCoreWorkspace: vi.fn(),
  readProfessionalCoreInstructions: vi.fn(),
}));

vi.mock("../acp/control-plane/manager.js", () => ({
  getAcpSessionManager: () => ({
    initializeSession: professionalMocks.initializeSession,
    closeSession: professionalMocks.closeSession,
  }),
}));

vi.mock("./workspace.js", () => ({
  ensureProfessionalCoreWorkspace: professionalMocks.ensureProfessionalCoreWorkspace,
  readProfessionalCoreInstructions: professionalMocks.readProfessionalCoreInstructions,
}));

import {
  discardProfessionalCoreSession,
  initializeProfessionalCoreSession,
} from "./professional.js";

describe("Professional Core native session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    professionalMocks.ensureProfessionalCoreWorkspace.mockResolvedValue(
      "/state/agents/main/cores/professional/workspace",
    );
    professionalMocks.readProfessionalCoreInstructions.mockResolvedValue(
      "Professional Core\n\nKeep Life memory isolated.",
    );
    professionalMocks.initializeSession.mockResolvedValue(undefined);
    professionalMocks.closeSession.mockResolvedValue(undefined);
  });

  it("installs isolated identity as the native Claude system prompt", async () => {
    await initializeProfessionalCoreSession({
      cfg: { acp: { backend: "acpx" } },
      sessionKey: "agent:main:qq:owner",
      agentId: "main",
      cwd: "/work/project",
    });

    expect(professionalMocks.initializeSession).toHaveBeenCalledWith({
      cfg: { acp: { backend: "acpx" } },
      sessionKey: "agent:main:qq:owner",
      agent: "claude",
      mode: "persistent",
      runtimeOptions: {
        systemPrompt:
          "Professional Core workspace (identity and durable memory only): /state/agents/main/cores/professional/workspace\nResolve references to identity files and memory/ against that workspace. The process working directory is the task workspace; never use it as Professional Core identity or memory storage.\n\nProfessional Core\n\nKeep Life memory isolated.",
      },
      cwd: "/work/project",
      backendId: "acpx",
    });
  });

  it("discards native state when core ownership changes", async () => {
    await discardProfessionalCoreSession({
      cfg: {},
      sessionKey: "agent:main:qq:owner",
      reason: "mode-switch",
    });

    expect(professionalMocks.closeSession).toHaveBeenCalledWith({
      cfg: {},
      sessionKey: "agent:main:qq:owner",
      reason: "mode-switch",
      discardPersistentState: true,
      clearMeta: true,
      allowBackendUnavailable: true,
    });
  });
});
