import { i18n, t } from "../i18n/index.ts";
import type { Locale } from "../i18n/index.ts";

export type RuntimeErrorKind =
  | "auth"
  | "permission"
  | "rateLimit"
  | "billing"
  | "timeout"
  | "network"
  | "unavailable"
  | "invalidInput"
  | "invalidResponse"
  | "notFound"
  | "conflict"
  | "cancelled"
  | "delivery"
  | "process"
  | "contextOverflow"
  | "sessionExpired"
  | "emptyResponse"
  | "resourceLimit"
  | "blocked"
  | "unknown";

export type RuntimeErrorPresentation = {
  kind: RuntimeErrorKind;
  raw: string;
  summary: string;
  localized: boolean;
};

type RuntimeErrorDescribeOptions = {
  locale?: Locale;
  translate?: (key: string) => string;
  fallback?: string;
};

const HAN_CHAR_RE = /\p{Script=Han}/gu;
const LATIN_CHAR_RE = /\p{Script=Latin}/gu;

const CODE_KIND: Record<string, RuntimeErrorKind> = {
  auth: "auth",
  auth_permanent: "auth",
  permission: "permission",
  forbidden: "permission",
  rate_limit: "rateLimit",
  billing: "billing",
  timeout: "timeout",
  overloaded: "unavailable",
  server_error: "unavailable",
  format: "invalidResponse",
  invalid_request: "invalidInput",
  context_overflow: "contextOverflow",
  model_not_found: "notFound",
  not_found: "notFound",
  conflict: "conflict",
  cancelled: "cancelled",
  canceled: "cancelled",
  delivery: "delivery",
  process_exit: "process",
  session_expired: "sessionExpired",
  empty_response: "emptyResponse",
  no_error_details: "emptyResponse",
  unclassified: "unknown",
  unknown: "unknown",
};

const TEXT_RULES: ReadonlyArray<{ kind: RuntimeErrorKind; pattern: RegExp }> = [
  {
    kind: "billing",
    pattern: /\b(?:402|payment required|billing|insufficient (?:credit|funds?))\b/u,
  },
  {
    kind: "auth",
    pattern:
      /\b(?:401|unauthorized|unauthenticated|authentication failed|invalid api key|invalid (?:access|auth(?:entication)?|bearer|refresh|session) token|token expired|expired token|invalid credential)\b/u,
  },
  {
    kind: "permission",
    pattern: /\b(?:403|forbidden|permission denied|access denied|eacces)\b/u,
  },
  {
    kind: "rateLimit",
    pattern: /\b(?:429|rate[ -]?limit|too many requests|quota exceeded|resource exhausted)\b/u,
  },
  {
    kind: "timeout",
    pattern: /\b(?:timeout|timed out|deadline exceeded|etimedout)\b/u,
  },
  {
    kind: "network",
    pattern:
      /\b(?:enotfound|eai_again|econnrefused|econnreset|dns|tls|certificate|socket (?:closed|hang up)|network error|fetch failed|disconnected|connection (?:closed|lost|refused|reset)|unexpected eof)\b/u,
  },
  {
    kind: "unavailable",
    pattern: /\b(?:5\d\d|service unavailable|bad gateway|gateway timeout|overloaded)\b/u,
  },
  {
    kind: "contextOverflow",
    pattern: /\b(?:context (?:length|window).*(?:exceed|overflow)|too many tokens)\b/u,
  },
  {
    kind: "sessionExpired",
    pattern: /\b(?:session expired|expired session)\b/u,
  },
  {
    kind: "emptyResponse",
    pattern: /\b(?:empty response|no response body|returned no stdout|no error details)\b/u,
  },
  {
    kind: "blocked",
    pattern:
      /\b(?:content filter|safety filter|blocked by safety|policy violation|refused to generate)\b/u,
  },
  {
    kind: "resourceLimit",
    pattern:
      /\b(?:enospc|no space left|disk full|out of memory|heap out of memory|oom|too many open files|emfile)\b/u,
  },
  {
    kind: "invalidResponse",
    pattern:
      /\b(?:invalid response|malformed response|invalid json|json parse|parse error|unexpected token.*json)\b/u,
  },
  {
    kind: "invalidInput",
    pattern:
      /\b(?:400|bad request|invalid (?:request|config|configuration|schema|parameter|argument)|validation failed)\b/u,
  },
  {
    kind: "notFound",
    pattern: /\b(?:404|not found|enoent|command not found|model not found|unknown model)\b/u,
  },
  {
    kind: "conflict",
    pattern: /\b(?:409|conflict|already exists|already running)\b/u,
  },
  {
    kind: "cancelled",
    pattern: /\b(?:cancelled|canceled|aborted|aborterror)\b/u,
  },
  {
    kind: "delivery",
    pattern: /\b(?:(?:deliver|delivery|webhook|send).*(?:fail|error|reject))\b/u,
  },
  {
    kind: "process",
    pattern: /\b(?:exit(?:ed)? (?:with )?(?:code|status)|spawn .* failed|command failed)\b/u,
  },
];

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : String(error ?? "");
}

function normalizeError(error: unknown): string {
  return stringifyError(error).trim();
}

function isPredominantlyChinese(message: string): boolean {
  const hanCount = message.match(HAN_CHAR_RE)?.length ?? 0;
  if (hanCount < 2) {
    return false;
  }
  const latinCount = message.match(LATIN_CHAR_RE)?.length ?? 0;
  return hanCount * 2 >= latinCount;
}

export function classifyRuntimeError(error: unknown, code?: string | null): RuntimeErrorKind {
  const normalizedCode = code?.trim().toLowerCase().replaceAll("-", "_");
  if (normalizedCode && CODE_KIND[normalizedCode]) {
    return CODE_KIND[normalizedCode];
  }
  const lower = normalizeError(error).toLowerCase();
  return TEXT_RULES.find((rule) => rule.pattern.test(lower))?.kind ?? "unknown";
}

export function describeRuntimeError(
  error: unknown,
  code?: string | null,
  options?: RuntimeErrorDescribeOptions,
): RuntimeErrorPresentation | null {
  const rawError = stringifyError(error);
  const fallback = options?.fallback;
  const raw = rawError.trim() ? rawError : fallback?.trim() ? fallback : code?.trim() ? code : "";
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }
  const locale = options?.locale ?? i18n.getLocale();
  if (locale !== "zh-CN") {
    return {
      kind: "unknown",
      raw,
      summary: fallback?.trim() ? fallback : raw,
      localized: false,
    };
  }
  if (isPredominantlyChinese(normalized)) {
    return { kind: "unknown", raw, summary: raw, localized: false };
  }
  const kind = classifyRuntimeError(normalized, code);
  const translate = options?.translate ?? t;
  return {
    kind,
    raw,
    summary: `${translate(`runtimeError.${kind}.title`)}：${translate(
      `runtimeError.${kind}.guidance`,
    )}`,
    localized: true,
  };
}

export function formatRuntimeErrorInline(
  error: unknown,
  code?: string | null,
  options?: RuntimeErrorDescribeOptions,
): string {
  const presentation = describeRuntimeError(error, code, options);
  if (!presentation) {
    return "";
  }
  return presentation.localized
    ? `${presentation.summary}（${options?.translate?.("runtimeError.technicalDetails") ?? t("runtimeError.technicalDetails")}：${presentation.raw}）`
    : presentation.summary;
}

/** Synchronous light-DOM element so error text is present in the first rendered frame. */
export class RuntimeErrorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["compact"];
  }

  private errorValue: unknown = null;
  private codeValue?: string;
  private fallbackValue?: string;
  private unsubscribeLocale?: () => void;

  get error(): unknown {
    return this.errorValue;
  }

  set error(value: unknown) {
    this.errorValue = value;
    this.renderContents();
  }

  get code(): string | undefined {
    return this.codeValue;
  }

  set code(value: string | undefined) {
    this.codeValue = value;
    this.renderContents();
  }

  get fallback(): string | undefined {
    return this.fallbackValue;
  }

  set fallback(value: string | undefined) {
    this.fallbackValue = value;
    this.renderContents();
  }

  connectedCallback() {
    this.unsubscribeLocale ??= i18n.subscribe(() => this.renderContents());
    this.applyHostStyles();
    this.renderContents();
  }

  attributeChangedCallback() {
    this.applyHostStyles();
  }

  disconnectedCallback() {
    this.unsubscribeLocale?.();
    this.unsubscribeLocale = undefined;
  }

  private renderContents() {
    const presentation = describeRuntimeError(this.errorValue, this.codeValue, {
      fallback: this.fallbackValue,
    });
    this.replaceChildren();
    if (!presentation) {
      return;
    }
    if (!presentation.localized) {
      const raw = document.createElement("span");
      raw.className = "runtime-error__raw";
      raw.textContent = presentation.summary;
      raw.style.overflowWrap = "anywhere";
      this.append(raw);
      return;
    }
    const summaryText = document.createElement("span");
    summaryText.className = "runtime-error__summary";
    summaryText.textContent = presentation.summary;
    summaryText.style.overflowWrap = "anywhere";
    const details = document.createElement("details");
    details.className = "runtime-error__details";
    details.style.marginTop = "6px";
    details.style.fontSize = "0.9em";
    const summary = document.createElement("summary");
    summary.textContent = t("runtimeError.technicalDetails");
    summary.style.width = "fit-content";
    summary.style.cursor = "pointer";
    summary.style.color = "inherit";
    summary.style.opacity = "0.78";
    const code = document.createElement("code");
    code.textContent = presentation.raw;
    code.style.display = "block";
    code.style.maxHeight = "12rem";
    code.style.marginTop = "5px";
    code.style.padding = "6px 8px";
    code.style.overflow = "auto";
    code.style.borderRadius = "6px";
    code.style.background = "color-mix(in srgb, currentColor 8%, transparent)";
    code.style.color = "inherit";
    code.style.fontFamily = "var(--font-mono)";
    code.style.fontSize = "0.9em";
    code.style.whiteSpace = "pre-wrap";
    code.style.overflowWrap = "anywhere";
    details.append(summary, code);
    this.append(summaryText, details);
  }

  private applyHostStyles() {
    this.style.display = this.hasAttribute("compact") ? "inline" : "block";
    this.style.minWidth = "0";
  }
}

if (!customElements.get("openclaw-runtime-error")) {
  customElements.define("openclaw-runtime-error", RuntimeErrorElement);
}
