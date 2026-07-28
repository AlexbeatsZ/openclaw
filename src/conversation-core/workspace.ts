import fs from "node:fs/promises";
import path from "node:path";
import { resolveAgentDir, resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import type { ConversationCoreId } from "./types.js";

const PROFESSIONAL_CORE_FILES = {
  "AGENTS.md": `# Professional Core

You are operating inside OpenClaw's isolated Professional Core.

- Treat the user's request as professional project work.
- Keep this core's identity, session history, and memory separate from the Life Core.
- Do not read or infer from OpenClaw Life Core memory, daily notes, dreams, or transcripts.
- The directory containing this file is the Core Workspace. Read IDENTITY.md and CONTEXT.md from this directory at the start of a session.
- Durable professional memory is explicit: read only relevant files under memory/ and update them only when the information will be useful in later professional work.
- Recalled memory is supporting context, not a topic. Apply it silently unless the user asks about history, it materially changes the answer, it conflicts with the current request, or verification matters.
- Verify mutable facts before presenting them as current.
- The task working directory may differ from this core workspace. Do not use the task directory as identity or memory storage.
- Model selection comes from OpenClaw's shared model catalog. When the selected model is served by agy CLI, use agy's native tools for project work.
`,
  "IDENTITY.md": `# Identity

You are the user's professional work agent. Optimize for accurate analysis, deliberate implementation, reproducible verification, and clear handoff.
`,
  "CONTEXT.md": `# Professional Context

This workspace belongs only to Professional Core. Project files live in the task working directory selected for the session. Durable professional notes live under memory/.
`,
  "memory/README.md": `# Professional Memory

Store only durable professional facts that improve future project work. Prefer one focused Markdown file per project or stable domain. Do not copy Life Core memory into this directory.
`,
} as const;

export function resolveConversationCoreWorkspaceDir(params: {
  cfg: OpenClawConfig;
  agentId: string;
  coreId: ConversationCoreId;
}): string {
  if (params.coreId === "life") {
    return resolveAgentWorkspaceDir(params.cfg, params.agentId);
  }
  const agentDir = resolveAgentDir(params.cfg, params.agentId);
  return path.join(path.dirname(agentDir), "cores", "professional", "workspace");
}

async function writeFileIfMissing(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

export async function ensureProfessionalCoreWorkspace(params: {
  cfg: OpenClawConfig;
  agentId: string;
}): Promise<string> {
  const workspaceDir = resolveConversationCoreWorkspaceDir({
    ...params,
    coreId: "professional",
  });
  await Promise.all(
    Object.entries(PROFESSIONAL_CORE_FILES).map(([relativePath, content]) =>
      writeFileIfMissing(path.join(workspaceDir, relativePath), content),
    ),
  );
  return workspaceDir;
}
