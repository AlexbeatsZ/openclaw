// Control UI chat module implements chat queue behavior.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { ChatQueueItem } from "../ui-types.ts";

export type ChatQueueProps = {
  queue: ChatQueueItem[];
  canAbort?: boolean;
  onQueueRetry?: (id: string) => void;
  onQueueSteer?: (id: string) => void;
  onQueueRemove: (id: string) => void;
};

function sendStateLabel(item: ChatQueueItem): string | null {
  switch (item.sendState) {
    case "waiting-model":
      return t("rawUi.chat_queue_waitingModel");
    case "sending":
      return t("rawUi.chat_queue_sending");
    case "waiting-reconnect":
      return t("rawUi.chat_queue_waitingReconnect");
    case "failed":
      return t("rawUi.chat_queue_failed");
    default:
      return null;
  }
}

export function renderChatQueue(props: ChatQueueProps) {
  if (!props.queue.length) {
    return nothing;
  }
  return html`
    <div class="chat-queue" role="status" aria-live="polite">
      <div class="chat-queue__title">
        ${t("rawUi.chat_queue_fragment_dff7f397b516")}${props.queue.length})
      </div>
      <div class="chat-queue__list">
        ${props.queue.map((item) => {
          const stateLabel = sendStateLabel(item);
          return html`
            <div
              class="chat-queue__item ${item.kind === "steered" ? "chat-queue__item--steered" : ""}"
            >
              <div class="chat-queue__main">
                ${item.kind === "steered"
                  ? html`<span class="chat-queue__badge"
                      >${t("rawUi.chat_queue_text_a79dd37f4053")}</span
                    >`
                  : nothing}
                ${stateLabel ? html`<span class="chat-queue__badge">${stateLabel}</span>` : nothing}
                <div class="chat-queue__text">
                  ${item.text ||
                  (item.attachments?.length
                    ? t("rawUi.chat_queue_dynamic_imageCount", {
                        count: String(item.attachments.length),
                      })
                    : "")}
                </div>
                ${item.sendError
                  ? html`<div class="chat-queue__error">${item.sendError}</div>`
                  : nothing}
              </div>
              <div class="chat-queue__actions">
                ${item.sendState === "failed" && props.onQueueRetry
                  ? html`
                      <button
                        class="btn chat-queue__retry"
                        type="button"
                        title=${t("chat.queue.retrySend")}
                        aria-label=${t("chat.queue.retryQueuedMessage")}
                        @click=${() => props.onQueueRetry?.(item.id)}
                      >
                        ${icons.refresh}
                        <span>${t("chat.queue.retry")}</span>
                      </button>
                    `
                  : nothing}
                ${props.canAbort &&
                props.onQueueSteer &&
                item.kind !== "steered" &&
                !item.sendState &&
                !item.localCommandName
                  ? html`
                      <button
                        class="btn chat-queue__steer"
                        type="button"
                        title=${t("rawUi.chat_queue_attr_47bbfd8221a7")}
                        aria-label=${t("rawUi.chat_queue_attr_fcb68965f18a")}
                        @click=${() => props.onQueueSteer?.(item.id)}
                      >
                        ${icons.cornerDownRight}
                        <span>${t("rawUi.chat_queue_text_be8f13f9a4d1")}</span>
                      </button>
                    `
                  : nothing}
                <button
                  class="btn chat-queue__remove"
                  type="button"
                  aria-label=${t("rawUi.chat_queue_attr_fc6fdae06b1d")}
                  @click=${() => props.onQueueRemove(item.id)}
                >
                  ${icons.x}
                </button>
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
