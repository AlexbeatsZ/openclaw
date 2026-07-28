import { getAcpSessionManager } from "../acp/control-plane/manager.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { PROFESSIONAL_CORE_ACP_AGENT } from "./types.js";
import { ensureProfessionalCoreWorkspace, readProfessionalCoreInstructions } from "./workspace.js";

export async function initializeProfessionalCoreSession(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  agentId: string;
  cwd?: string;
}): Promise<void> {
  const coreWorkspace = await ensureProfessionalCoreWorkspace({
    cfg: params.cfg,
    agentId: params.agentId,
  });
  const instructions = await readProfessionalCoreInstructions(coreWorkspace);
  const systemPrompt = [
    `Professional Core workspace (identity and durable memory only): ${coreWorkspace}`,
    "Resolve references to identity files and memory/ against that workspace. The process working directory is the task workspace; never use it as Professional Core identity or memory storage.",
    "",
    instructions,
  ].join("\n");
  await getAcpSessionManager().initializeSession({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
    agent: normalizeAgentId(PROFESSIONAL_CORE_ACP_AGENT),
    mode: "persistent",
    runtimeOptions: { systemPrompt },
    cwd: params.cwd ?? coreWorkspace,
    backendId: params.cfg.acp?.backend,
  });
}

export async function discardProfessionalCoreSession(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  reason: string;
}): Promise<void> {
  await getAcpSessionManager().closeSession({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
    reason: params.reason,
    discardPersistentState: true,
    clearMeta: true,
    allowBackendUnavailable: true,
  });
}
