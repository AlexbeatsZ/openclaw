// Control UI chat module implements copy as markdown behavior.
import { html, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { copyToClipboard } from "./clipboard.ts";

const COPIED_FOR_MS = 1500;
const ERROR_FOR_MS = 2000;
const copyLabel = () => t("rawUi.copy_markdown_copy");
const copiedLabel = () => t("rawUi.copy_markdown_copied");
const errorLabel = () => t("rawUi.copy_markdown_failed");

type CopyButtonOptions = {
  text: () => string;
  label?: string;
};

function setButtonLabel(button: HTMLButtonElement, label: string) {
  button.title = label;
  button.setAttribute("aria-label", label);
}

function createCopyButton(options: CopyButtonOptions): TemplateResult {
  const idleLabel = options.label ?? copyLabel();
  return html`
    <button
      class="btn btn--xs chat-copy-btn"
      type="button"
      title=${idleLabel}
      aria-label=${idleLabel}
      @click=${async (e: Event) => {
        const btn = e.currentTarget as HTMLButtonElement | null;

        if (!btn || btn.dataset.copying === "1") {
          return;
        }

        btn.dataset.copying = "1";
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;

        const copied = await copyToClipboard(options.text());
        if (!btn.isConnected) {
          return;
        }

        delete btn.dataset.copying;
        btn.removeAttribute("aria-busy");
        btn.disabled = false;

        if (!copied) {
          btn.dataset.error = "1";
          setButtonLabel(btn, errorLabel());

          window.setTimeout(() => {
            if (!btn.isConnected) {
              return;
            }
            delete btn.dataset.error;
            setButtonLabel(btn, idleLabel);
          }, ERROR_FOR_MS);
          return;
        }

        btn.dataset.copied = "1";
        setButtonLabel(btn, copiedLabel());

        window.setTimeout(() => {
          if (!btn.isConnected) {
            return;
          }
          delete btn.dataset.copied;
          setButtonLabel(btn, idleLabel);
        }, COPIED_FOR_MS);
      }}
    >
      <span class="chat-copy-btn__icon" aria-hidden="true">
        <span class="chat-copy-btn__icon-copy">${icons.copy}</span>
        <span class="chat-copy-btn__icon-check">${icons.check}</span>
      </span>
    </button>
  `;
}

export function renderCopyButton(text: string, label = copyLabel()): TemplateResult {
  return createCopyButton({ text: () => text, label });
}

export function renderCopyAsMarkdownButton(markdown: string): TemplateResult {
  return renderCopyButton(markdown, copyLabel());
}
