import { i18n } from "../i18n/index.ts";

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
  locale?: string;
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
  tls_certificate: "network",
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
  { kind: "timeout", pattern: /\b(?:timeout|timed out|deadline exceeded|etimedout)\b/u },
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
  { kind: "sessionExpired", pattern: /\b(?:session expired|expired session)\b/u },
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
  { kind: "conflict", pattern: /\b(?:409|conflict|already exists|already running)\b/u },
  { kind: "cancelled", pattern: /\b(?:cancelled|canceled|aborted|aborterror)\b/u },
  {
    kind: "delivery",
    pattern: /\b(?:(?:deliver|delivery|webhook|send).*(?:fail|error|reject))\b/u,
  },
  {
    kind: "process",
    pattern: /\b(?:exit(?:ed)? (?:with )?(?:code|status)|spawn .* failed|command failed)\b/u,
  },
];

const ZH_PRESENTATION: Record<RuntimeErrorKind, { title: string; guidance: string }> = {
  auth: { title: "身份验证失败", guidance: "请检查凭据是否有效或已过期。" },
  permission: { title: "没有访问权限", guidance: "请检查账号权限和访问策略。" },
  rateLimit: { title: "请求过于频繁", guidance: "请稍后重试，或检查配额限制。" },
  billing: { title: "计费或余额异常", guidance: "请检查服务商账户余额和计费状态。" },
  timeout: { title: "请求超时", guidance: "请检查服务状态和网络连接后重试。" },
  network: { title: "网络连接失败", guidance: "请检查代理、DNS、证书和目标服务。" },
  unavailable: { title: "服务暂时不可用", guidance: "请稍后重试，并检查上游服务状态。" },
  invalidInput: { title: "请求参数无效", guidance: "请检查输入、配置和模型参数。" },
  invalidResponse: { title: "服务返回了无效响应", guidance: "请检查服务兼容性和原始响应。" },
  notFound: { title: "未找到所需资源", guidance: "请检查模型、文件、命令或资源名称。" },
  conflict: { title: "当前操作发生冲突", guidance: "请确认是否已有同类操作正在运行。" },
  cancelled: { title: "操作已取消", guidance: "如非主动取消，请检查上游中断原因。" },
  delivery: { title: "消息发送失败", guidance: "请检查目标通道和投递配置。" },
  process: { title: "后台进程执行失败", guidance: "请查看技术详情中的退出状态和输出。" },
  contextOverflow: { title: "上下文长度超限", guidance: "请缩短输入或减少历史上下文。" },
  sessionExpired: { title: "会话已失效", guidance: "请重新建立会话或完成登录。" },
  emptyResponse: { title: "服务没有返回可用内容", guidance: "请检查提供商日志后重试。" },
  resourceLimit: { title: "系统资源不足", guidance: "请检查磁盘、内存和文件句柄。" },
  blocked: { title: "请求被安全策略拦截", guidance: "请调整内容或检查提供商策略。" },
  unknown: { title: "操作失败", guidance: "请展开技术详情查看原始错误。" },
};

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : String(error ?? "");
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
  const lower = stringifyError(error).trim().toLowerCase();
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
  if (!raw.trim()) {
    return null;
  }
  if ((options?.locale ?? i18n.getLocale()) !== "zh-CN") {
    return { kind: "unknown", raw, summary: fallback?.trim() ? fallback : raw, localized: false };
  }
  if (isPredominantlyChinese(raw.trim())) {
    return { kind: "unknown", raw, summary: raw, localized: false };
  }
  const kind = classifyRuntimeError(raw, code);
  const localized = ZH_PRESENTATION[kind];
  return {
    kind,
    raw,
    summary: `${localized.title}：${localized.guidance}`,
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
    ? `${presentation.summary}（技术详情：${presentation.raw}）`
    : presentation.summary;
}

/** Synchronous light-DOM element so localized error text is present on first render. */
export class RuntimeErrorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["compact"];
  }

  private errorValue: unknown = null;
  private codeValue?: string;
  private fallbackValue?: string;
  private unsubscribeLocale?: () => void;

  set error(value: unknown) {
    this.errorValue = value;
    this.renderContents();
  }

  set code(value: string | undefined) {
    this.codeValue = value;
    this.renderContents();
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
    const summaryText = document.createElement("span");
    summaryText.className = presentation.localized
      ? "runtime-error__summary"
      : "runtime-error__raw";
    summaryText.textContent = presentation.summary;
    summaryText.style.overflowWrap = "anywhere";
    this.append(summaryText);
    if (!presentation.localized) {
      return;
    }
    const details = document.createElement("details");
    details.className = "runtime-error__details";
    details.style.marginTop = "6px";
    details.style.fontSize = "0.9em";
    const summary = document.createElement("summary");
    summary.textContent = "技术详情";
    summary.style.width = "fit-content";
    summary.style.cursor = "pointer";
    summary.style.opacity = "0.78";
    const code = document.createElement("code");
    code.textContent = presentation.raw;
    Object.assign(code.style, {
      display: "block",
      maxHeight: "12rem",
      marginTop: "5px",
      padding: "6px 8px",
      overflow: "auto",
      borderRadius: "6px",
      background: "color-mix(in srgb, currentColor 8%, transparent)",
      color: "inherit",
      fontFamily: "var(--font-mono)",
      fontSize: "0.9em",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    });
    details.append(summary, code);
    this.append(details);
  }

  private applyHostStyles() {
    this.style.display = this.hasAttribute("compact") ? "inline" : "block";
    this.style.minWidth = "0";
  }
}

if (!customElements.get("openclaw-runtime-error")) {
  customElements.define("openclaw-runtime-error", RuntimeErrorElement);
}
