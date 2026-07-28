import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  ensureProfessionalCoreWorkspace,
  resolveConversationCoreWorkspaceDir,
} from "./workspace.js";

const cleanupDirs: string[] = [];

describe("Professional Core workspace", () => {
  afterEach(async () => {
    await Promise.all(cleanupDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true })));
  });

  it("uses an isolated workspace with OpenClaw and agy-compatible instructions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-professional-core-"));
    cleanupDirs.push(root);
    const agentDir = path.join(root, "agents", "main", "agent");
    const cfg = {
      agents: { list: [{ id: "main", default: true, agentDir }] },
    } satisfies OpenClawConfig;

    const workspaceDir = await ensureProfessionalCoreWorkspace({ cfg, agentId: "main" });

    expect(workspaceDir).toBe(
      path.join(root, "agents", "main", "cores", "professional", "workspace"),
    );
    await expect(fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf8")).resolves.toContain(
      "Model selection comes from OpenClaw's shared model catalog",
    );
    await expect(fs.readFile(path.join(workspaceDir, "IDENTITY.md"), "utf8")).resolves.toContain(
      "professional work agent",
    );
    await expect(
      fs.readFile(path.join(workspaceDir, "memory", "README.md"), "utf8"),
    ).resolves.toContain("Do not copy Life Core memory");
    await expect(fs.stat(path.join(workspaceDir, "CLAUDE.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps the Life workspace on the configured agent workspace", () => {
    const cfg = {
      agents: {
        list: [
          {
            id: "main",
            default: true,
            agentDir: "C:/state/agents/main/agent",
            workspace: "C:/state/life",
          },
        ],
      },
    } satisfies OpenClawConfig;

    expect(resolveConversationCoreWorkspaceDir({ cfg, agentId: "main", coreId: "life" })).toBe(
      path.resolve("C:/state/life"),
    );
  });
});
