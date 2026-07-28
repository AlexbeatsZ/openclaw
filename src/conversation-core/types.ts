import type { SessionEntry } from "../config/sessions/types.js";

export const CONVERSATION_CORE_IDS = ["life", "professional"] as const;
export type ConversationCoreId = (typeof CONVERSATION_CORE_IDS)[number];

export const DEFAULT_CONVERSATION_CORE_ID: ConversationCoreId = "life";

export function normalizeConversationCoreId(value: unknown): ConversationCoreId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return CONVERSATION_CORE_IDS.find((id) => id === normalized);
}

/** Legacy rows without an explicit binding remain Life Core sessions. */
export function resolveConversationCoreId(
  entry: Pick<SessionEntry, "conversationCoreId"> | null | undefined,
): ConversationCoreId {
  return normalizeConversationCoreId(entry?.conversationCoreId) ?? DEFAULT_CONVERSATION_CORE_ID;
}

export function conversationCoreLabel(coreId: ConversationCoreId): string {
  return coreId === "professional" ? "Professional" : "Life";
}
