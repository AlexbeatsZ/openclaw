import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
// Control UI view renders markdown sidebar screen content.
import { t } from "../../i18n/index.ts";
import { resolveCanvasIframeUrl } from "../canvas-url.ts";
import { resolveEmbedSandbox, type EmbedSandboxMode } from "../embed-sandbox.ts";
import { icons } from "../icons.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
import type { SidebarContent } from "../sidebar-content.ts";

function resolveSidebarCanvasSandbox(
  content: SidebarContent,
  embedSandboxMode: EmbedSandboxMode,
): string {
  return content.kind === "canvas" ? resolveEmbedSandbox(embedSandboxMode) : "allow-scripts";
}

export type MarkdownSidebarProps = {
  content: SidebarContent | null;
  error: string | null;
  onClose: () => void;
  onViewRawText: () => void;
  canvasPluginSurfaceUrl?: string | null;
  embedSandboxMode?: EmbedSandboxMode;
  allowExternalEmbedUrls?: boolean;
};

export function renderMarkdownSidebar(props: MarkdownSidebarProps) {
  const content = props.content;
  const markdownHtml =
    content?.kind === "markdown" && content.content.trim()
      ? toSanitizedMarkdownHtml(content.content)
      : "";
  const canvasSandbox =
    content?.kind === "canvas"
      ? resolveSidebarCanvasSandbox(content, props.embedSandboxMode ?? "scripts")
      : "";
  const canvasSrc =
    content?.kind === "canvas"
      ? resolveCanvasIframeUrl(
          content.entryUrl,
          props.canvasPluginSurfaceUrl,
          props.allowExternalEmbedUrls ?? false,
        )
      : null;
  const title =
    content?.kind === "canvas"
      ? content.title?.trim() || t("rawUi.markdown_sidebar_renderPreview")
      : content?.kind === "image"
        ? content.title.trim() || t("rawUi.markdown_sidebar_imagePreview")
        : content?.kind === "markdown"
          ? t("rawUi.markdown_sidebar_markdownPreview")
          : t("rawUi.markdown_sidebar_toolDetails");
  return html`
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <div class="sidebar-title">${title}</div>
        <button
          @click=${props.onClose}
          class="btn"
          type="button"
          title=${t("rawUi.markdown_sidebar_attr_570d4312a5bc")}
          aria-label=${t("rawUi.markdown_sidebar_attr_d5037b4ecedb")}
        >
          ${icons.x}
        </button>
      </div>
      <div class="sidebar-content">
        ${props.error
          ? html`
              <div class="callout danger">${props.error}</div>
              ${content?.rawText?.trim()
                ? html`
                    <button
                      @click=${props.onViewRawText}
                      class="btn"
                      type="button"
                      style="margin-top: 12px;"
                    >
                      ${t("rawUi.markdown_sidebar_text_c896a733988a")}
                    </button>
                  `
                : nothing}
            `
          : content
            ? content.kind === "canvas"
              ? html`
                  <div class="chat-tool-card__preview" data-kind="canvas">
                    <div class="chat-tool-card__preview-panel" data-side="front">
                      ${keyed(
                        `${canvasSandbox}\u0000${canvasSrc ?? ""}\u0000${content.preferredHeight ?? ""}`,
                        html`
                          <iframe
                            class="chat-tool-card__preview-frame"
                            title=${content.title?.trim() ||
                            t("rawUi.markdown_sidebar_dynamic_94c528366166")}
                            sandbox=${canvasSandbox}
                            src=${canvasSrc ?? nothing}
                            style=${content.preferredHeight
                              ? `height:${content.preferredHeight}px`
                              : ""}
                          ></iframe>
                        `,
                      )}
                    </div>
                    ${content.rawText?.trim()
                      ? html`
                          <div style="margin-top: 12px;">
                            <button @click=${props.onViewRawText} class="btn" type="button">
                              ${t("rawUi.markdown_sidebar_text_c896a733988a")}
                            </button>
                          </div>
                        `
                      : nothing}
                  </div>
                `
              : content.kind === "image"
                ? html`
                    <div class="chat-tool-card__preview" data-kind="image">
                      <div class="chat-tool-card__preview-panel" data-side="front">
                        <img
                          class="chat-tool-card__preview-image"
                          src=${content.src}
                          alt=${title}
                          style="display:block;max-width:100%;height:auto;border-radius:8px;"
                        />
                      </div>
                      ${content.rawText?.trim()
                        ? html`
                            <div style="margin-top: 12px;">
                              <button @click=${props.onViewRawText} class="btn" type="button">
                                ${t("rawUi.markdown_sidebar_text_c896a733988a")}
                              </button>
                            </div>
                          `
                        : nothing}
                    </div>
                  `
                : html`
                    <section class="sidebar-markdown-shell">
                      <div class="sidebar-markdown-shell__toolbar">
                        <div class="sidebar-markdown-shell__intro">
                          <div class="sidebar-markdown-shell__eyebrow">
                            ${icons.scrollText}
                            <span>${t("rawUi.markdown_sidebar_text_54c9476e4ba1")}</span>
                          </div>
                          <div class="sidebar-markdown-shell__hint">
                            ${t("rawUi.markdown_sidebar_text_ce8dec5e38b5")}
                          </div>
                        </div>
                        <button @click=${props.onViewRawText} class="btn btn--sm" type="button">
                          ${t("rawUi.markdown_sidebar_text_c896a733988a")}
                        </button>
                      </div>
                      ${markdownHtml
                        ? html`
                            <article class="sidebar-markdown-reader sidebar-markdown">
                              ${unsafeHTML(markdownHtml)}
                            </article>
                          `
                        : html`
                            <div class="sidebar-markdown-empty">
                              ${t("rawUi.markdown_sidebar_text_5a4b14bd6112")}
                            </div>
                          `}
                    </section>
                  `
            : html` <div class="muted">${t("rawUi.markdown_sidebar_text_2e365529ff01")}</div> `}
      </div>
    </div>
  `;
}
