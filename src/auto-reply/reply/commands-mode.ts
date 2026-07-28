/** Handles isolated Life/Professional conversation-core lifecycle switches. */
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
          : `Current mode: ${conversationCoreLabel(current)} (${current}).\nCurrent model: ${params.provider}/${params.model}.\nBoth modes use the shared OpenClaw model catalog; use /model to inspect or change the model.`,
      },
    };
  }
  if (
    parsed.target === current &&
    normalizeConversationCoreId(currentEntry?.conversationCoreId) === parsed.target
  ) {
    return {
      shouldContinue: false,
      reply: {
        text: `Already in ${conversationCoreLabel(current)} mode. Current model: ${params.provider}/${params.model}.`,
      },
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

  updateCommandSessionBinding(params, switched.entry);
  return {
    shouldContinue: false,
    reply: {
      text:
        parsed.target === "professional"
          ? `✅ Switched to Professional mode. A fresh isolated work session is ready; Life memory and transcript are not loaded. Model: ${switched.resolved.modelProvider}/${switched.resolved.model}.`
          : `✅ Switched to Life mode. A fresh personal session is ready; Professional memory and history remain isolated. Model: ${switched.resolved.modelProvider}/${switched.resolved.model}.`,
    },
  };
};
