import { html, nothing, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
// Control UI chat module implements side result render behavior.
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
import { detectTextDirection } from "../text-direction.ts";
import type { ChatSideResult } from "./side-result.ts";

export function renderSideResult(
  sideResult: ChatSideResult | null | undefined,
  onDismiss?: () => void,
): TemplateResult | typeof nothing {
  if (!sideResult) {
    return nothing;
  }
  return html`
    <section
      class=${`chat-side-result ${sideResult.isError ? "chat-side-result--error" : ""}`}
      role="status"
      aria-live="polite"
      aria-label=${t("rawUi.side_result_render_attr_1d3cd3b3ba2b")}
    >
      <div class="chat-side-result__header">
        <div class="chat-side-result__label-row">
          <span class="chat-side-result__label"
            >${t("rawUi.side_result_render_text_0069a5e11ba1")}</span
          >
          <span class="chat-side-result__meta"
            >${t("rawUi.side_result_render_text_623878c6c534")}</span
          >
        </div>
        <button
          class="btn chat-side-result__dismiss"
          type="button"
          aria-label=${t("rawUi.side_result_render_attr_38e4591b392d")}
          title=${t("rawUi.side_result_render_attr_3217db5aa5e9")}
          @click=${() => onDismiss?.()}
        >
          ${icons.x}
        </button>
      </div>
      <div class="chat-side-result__question">${sideResult.question}</div>
      <div class="chat-side-result__body" dir=${detectTextDirection(sideResult.text)}>
        ${unsafeHTML(toSanitizedMarkdownHtml(sideResult.text))}
      </div>
    </section>
  `;
}
