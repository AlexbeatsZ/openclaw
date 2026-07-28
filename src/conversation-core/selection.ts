import type { AcpSessionResolution } from "../acp/control-plane/manager.types.js";
import type { SessionEntry } from "../config/sessions/types.js";
import {
  normalizeConversationCoreId,
  resolveConversationCoreId,
  type ConversationCoreId,
} from "./types.js";

export type ConversationCoreRunPlan =
  | { coreId: "life"; implementation: "openclaw" }
  | {
      coreId: "life";
      implementation: "legacy-acp";
      resolution: Extract<AcpSessionResolution, { kind: "ready" }>;
    }
  | {
      coreId: "professional";
      implementation: "professional-acp";
      resolution: Extract<AcpSessionResolution, { kind: "ready" }>;
    };

export function resolveConversationCoreRunPlan(params: {
  entry?: Pick<SessionEntry, "conversationCoreId">;
  acpResolution?: AcpSessionResolution | null;
  rawModelRun: boolean;
}): ConversationCoreRunPlan {
  const explicitCore = normalizeConversationCoreId(params.entry?.conversationCoreId);
  const coreId = resolveConversationCoreId(params.entry);
  const acpResolution = params.acpResolution;

  if (coreId === "professional") {
    if (params.rawModelRun) {
      throw new Error("Professional Core does not support raw model runs.");
    }
    if (acpResolution?.kind === "stale") {
      throw acpResolution.error;
    }
    if (acpResolution?.kind !== "ready") {
      throw new Error(
        "Professional Core native session is unavailable. Run /mode professional again after checking ACP/Claude availability.",
      );
    }
    return {
      coreId,
      implementation: "professional-acp",
      resolution: acpResolution,
    };
  }

  // Existing ACP-bound rows predate explicit Core bindings. Preserve them as
  // legacy native sessions; newly explicit Life sessions fail closed instead
  // of silently crossing into a different runtime.
  if (!params.rawModelRun && acpResolution?.kind === "ready") {
    if (explicitCore === "life") {
      throw new Error(
        "Life Core session has an incompatible Professional/ACP binding. Start a new Life session with /mode life.",
      );
    }
    return {
      coreId: "life",
      implementation: "legacy-acp",
      resolution: acpResolution,
    };
  }
  if (!params.rawModelRun && acpResolution?.kind === "stale") {
    throw acpResolution.error;
  }
  return { coreId: "life", implementation: "openclaw" };
}

export function assertConversationCoreForkCompatible(params: {
  parent?: Pick<SessionEntry, "conversationCoreId">;
  requested?: ConversationCoreId;
}): ConversationCoreId {
  const parentCore = resolveConversationCoreId(params.parent);
  const requestedCore = params.requested ?? parentCore;
  if (requestedCore !== parentCore) {
    throw new Error(
      `Cannot fork across conversation cores (${parentCore} -> ${requestedCore}); create a fresh session instead.`,
    );
  }
  return requestedCore;
}
