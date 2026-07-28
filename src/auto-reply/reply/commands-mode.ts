/** Handles isolated Life/Professional conversation-core lifecycle switches. */
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { initializeProfessionalCoreSession } from "../../conversation-core/professional.js";
import {
  conversationCoreLabel,
  normalizeConversationCoreId,
  resolveConversationCoreId,
  type ConversationCoreId,
} from "../../conversation-core/types.js";
import { logVerbose } from "../../globals.js";
import type { CommandHandler, HandleCommandsParams } from "./commands-types.js";
import type { ReplySessionBinding } from "./get-reply.types.js";
import { isResetAuthorizedForContext } from "./reset-authorization.js";

type InternalModeCommandOptions = NonNullable<HandleCommandsParams["opts"]> & {
  onSessionPrepared?: (binding: ReplySessionBinding) => void;
};

const MODE_ALIASES = new Map<string, ConversationCoreId>([
  ["life", "life"],
  ["生活", "life"],
  ["personal", "life"],
  ["professional", "professional"],
  ["work", "professional"],
  ["工作", "professional"],
  ["专业", "professional"],
]);

export function parseModeCommand(
  value: string,
): { matched: false } | { matched: true; target?: ConversationCoreId; invalid?: string } {
  const match = value.trim().match(/^\/mode(?:\s+(.+?))?\s*$/i);
  if (!match) {
    return { matched: false };
  }
  const raw = match[1]?.trim().toLowerCase();
  if (!raw || raw === "status" || raw === "状态") {
    return { matched: true };
  }
  const target = MODE_ALIASES.get(raw) ?? normalizeConversationCoreId(raw);
  return target ? { matched: true, target } : { matched: true, invalid: raw };
}

function isModeSwitchAuthorized(params: HandleCommandsParams): boolean {
  return isResetAuthorizedForContext({
    ctx: params.ctx,
    cfg: params.cfg,
    commandAuthorized: params.command.isAuthorizedSender || params.ctx.CommandAuthorized === true,
  });
}

function updateCommandSessionBinding(
  params: HandleCommandsParams,
  entry: NonNullable<HandleCommandsParams["sessionEntry"]>,
): void {
  if (params.sessionStore) {
    params.sessionStore[params.sessionKey] = entry;
  }
  if (params.sessionEntry) {
    Object.assign(params.sessionEntry, entry);
  }
  (params.opts as InternalModeCommandOptions | undefined)?.onSessionPrepared?.({
    sessionKey: params.sessionKey,
    sessionId: entry.sessionId,
    storePath: params.storePath,
  });
}

export const handleModeCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const parsed = parseModeCommand(params.command.commandBodyNormalized);
  if (!parsed.matched) {
    return null;
  }
  if (!isModeSwitchAuthorized(params)) {
    logVerbose(
      `Ignoring /mode from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  const currentEntry = params.sessionStore?.[params.sessionKey] ?? params.sessionEntry;
  const current = resolveConversationCoreId(currentEntry);
  if (!parsed.target) {
    return {
      shouldContinue: false,
      reply: {
        text: parsed.invalid
          ? `Unknown mode "${parsed.invalid}". Use /mode life or /mode professional.`
          : `Current mode: ${conversationCoreLabel(current)} (${current}).\nUse /mode life or /mode professional to start a fresh isolated session in that core.`,
      },
    };
  }
  if (
    parsed.target === current &&
    normalizeConversationCoreId(currentEntry?.conversationCoreId) === parsed.target
  ) {
    if (current === "professional") {
      try {
        await initializeProfessionalCoreSession({
          cfg: params.cfg,
          sessionKey: params.sessionKey,
          agentId:
            params.agentId ??
            resolveSessionAgentId({
              sessionKey: params.sessionKey,
              config: params.cfg,
            }),
          cwd: currentEntry?.spawnedCwd,
        });
      } catch (error) {
        const failureReason = error instanceof Error ? error.message : String(error);
        return {
          shouldContinue: false,
          reply: {
            text: `⚠️ Professional mode is selected, but its native session is unavailable. ${failureReason}`,
          },
        };
      }
      return {
        shouldContinue: false,
        reply: { text: "Already in Professional mode. The isolated native session is ready." },
      };
    }
    return {
      shouldContinue: false,
      reply: { text: `Already in ${conversationCoreLabel(current)} mode.` },
    };
  }

  const { performGatewaySessionReset } =
    await import("../../gateway/server-methods/sessions.runtime.js");
  const switched = await performGatewaySessionReset({
    key: params.sessionKey,
    agentId: params.agentId,
    reason: "reset",
    commandSource: `${params.command.surface}:${params.ctx.CommandSource ?? "text"}:mode`,
    conversationCoreId: parsed.target,
    clearSpawnedCwd: false,
  });
  if (!switched.ok) {
    return {
      shouldContinue: false,
      reply: { text: `⚠️ Mode switch failed: ${switched.error.message}` },
    };
  }

  if (parsed.target === "professional") {
    try {
      await initializeProfessionalCoreSession({
        cfg: params.cfg,
        sessionKey: switched.key,
        agentId: switched.agentId,
        cwd: switched.entry.spawnedCwd,
      });
    } catch (error) {
      const rollback = await performGatewaySessionReset({
        key: switched.key,
        agentId: switched.agentId,
        reason: "reset",
        commandSource: `${params.command.surface}:${params.ctx.CommandSource ?? "text"}:mode-rollback`,
        conversationCoreId: current,
        clearSpawnedCwd: false,
      });
      if (rollback.ok) {
        updateCommandSessionBinding(params, rollback.entry);
      }
      const failureReason = error instanceof Error ? error.message : String(error);
      return {
        shouldContinue: false,
        reply: {
          text: rollback.ok
            ? `⚠️ Professional mode is unavailable, so the switch was rolled back to ${conversationCoreLabel(current)} mode. ${failureReason}`
            : `⚠️ Professional mode is unavailable, and automatic rollback also failed. Run /mode ${current} before continuing. ${failureReason}; rollback: ${rollback.error.message}`,
        },
      };
    }
  }

  updateCommandSessionBinding(params, switched.entry);
  return {
    shouldContinue: false,
    reply: {
      text:
        parsed.target === "professional"
          ? "✅ Switched to Professional mode. A fresh isolated native session is ready; Life memory and transcript are not loaded."
          : "✅ Switched to Life mode. A fresh OpenClaw session is ready; Professional memory and native history remain isolated.",
    },
  };
};
