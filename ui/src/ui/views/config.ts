// Control UI view renders config screen content.
import JSON5 from "json5";
import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import {
  BORDER_RADIUS_STOPS,
  TEXT_SCALE_STOPS,
  type BorderRadiusStop,
  type TextScaleStop,
} from "../storage.ts";
import type { ThemeTransitionContext } from "../theme-transition.ts";
import type { ThemeMode, ThemeName } from "../theme.ts";
import type { ConfigUiHints } from "../types.ts";
import {
  countSensitiveConfigValues,
  hintForPath,
  humanize,
  isSensitiveConfigPath,
  pathKey,
  REDACTED_PLACEHOLDER,
  schemaType,
  type JsonSchema,
} from "./config-form.shared.ts";
import { analyzeConfigSchema, renderConfigForm, SECTION_META } from "./config-form.ts";

const BORDER_RADIUS_LABELS: Record<BorderRadiusStop, string> = {
  get 0() {
    return t("rawUi.config_radius_none");
  },
  get 25() {
    return t("rawUi.config_radius_slight");
  },
  get 50() {
    return t("rawUi.config_radius_default");
  },
  get 75() {
    return t("rawUi.config_radius_round");
  },
  get 100() {
    return t("rawUi.config_radius_full");
  },
};

const TEXT_SCALE_LABELS: Record<TextScaleStop, string> = {
  get 90() {
    return t("rawUi.config_textScale_small");
  },
  get 100() {
    return t("rawUi.config_textScale_default");
  },
  get 110() {
    return t("rawUi.config_textScale_large");
  },
  get 125() {
    return t("rawUi.config_textScale_xl");
  },
  get 140() {
    return t("rawUi.config_textScale_xxl");
  },
};

export type WebPushUiState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
};

export type ConfigProps = {
  raw: string;
  originalRaw: string;
  valid: boolean | null;
  issues: unknown[];
  loading: boolean;
  saving: boolean;
  applying: boolean;
  updating: boolean;
  connected: boolean;
  schema: unknown;
  schemaLoading: boolean;
  uiHints: ConfigUiHints;
  formMode: "form" | "raw";
  rawAvailable?: boolean;
  showModeToggle?: boolean;
  formValue: Record<string, unknown> | null;
  originalValue: Record<string, unknown> | null;
  searchQuery: string;
  activeSection: string | null;
  activeSubsection: string | null;
  onRawChange: (next: string) => void;
  onFormModeChange: (mode: "form" | "raw") => void;
  onFormPatch: (path: Array<string | number>, value: unknown) => void;
  onSearchChange: (query: string) => void;
  onSectionChange: (section: string | null) => void;
  onSubsectionChange: (section: string | null) => void;
  onReload: () => void;
  onReset: () => void;
  onSave: () => void;
  onApply: () => void;
  onUpdate: () => void;
  onOpenFile?: () => void;
  version: string;
  theme: ThemeName;
  themeMode: ThemeMode;
  setTheme: (theme: ThemeName, context?: ThemeTransitionContext) => void;
  setThemeMode: (mode: ThemeMode, context?: ThemeTransitionContext) => void;
  hasCustomTheme: boolean;
  customThemeLabel: string | null;
  customThemeSourceUrl: string | null;
  customThemeImportUrl: string;
  customThemeImportBusy: boolean;
  customThemeImportMessage: { kind: "success" | "error"; text: string } | null;
  customThemeImportExpanded?: boolean;
  customThemeImportFocusToken?: number;
  onCustomThemeImportUrlChange: (next: string) => void;
  onImportCustomTheme: () => void;
  onClearCustomTheme: () => void;
  onOpenCustomThemeImport?: () => void;
  borderRadius: number;
  setBorderRadius: (value: number) => void;
  textScale: number;
  setTextScale: (value: number) => void;
  gatewayUrl: string;
  assistantName: string;
  configPath?: string | null;
  navRootLabel?: string;
  showRootTab?: boolean;
  includeSections?: string[];
  excludeSections?: string[];
  includeVirtualSections?: boolean;
  /** Layout mode: "tabs" (default flat scroll) or "accordion" (grouped collapsible). */
  settingsLayout?: "tabs" | "accordion";
  /** Callback to navigate back to Quick Settings. Shown in accordion mode. */
  onBackToQuick?: () => void;
  webPush?: WebPushUiState;
  onWebPushSubscribe?: () => void;
  onWebPushUnsubscribe?: () => void;
  onWebPushTest?: () => void;
  onRequestUpdate?: () => void;
};

// SVG Icons for sidebar (Lucide-style)
const sidebarIcons = {
  all: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  `,
  env: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      ></path>
    </svg>
  `,
  update: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `,
  agents: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"
      ></path>
      <circle cx="8" cy="14" r="1"></circle>
      <circle cx="16" cy="14" r="1"></circle>
    </svg>
  `,
  auth: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  `,
  channels: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `,
  messages: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  `,
  commands: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  `,
  hooks: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  `,
  skills: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      ></polygon>
    </svg>
  `,
  tools: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      ></path>
    </svg>
  `,
  gateway: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      ></path>
    </svg>
  `,
  wizard: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M15 4V2"></path>
      <path d="M15 16v-2"></path>
      <path d="M8 9h2"></path>
      <path d="M20 9h2"></path>
      <path d="M17.8 11.8 19 13"></path>
      <path d="M15 9h0"></path>
      <path d="M17.8 6.2 19 5"></path>
      <path d="m3 21 9-9"></path>
      <path d="M12.2 6.2 11 5"></path>
    </svg>
  `,
  // Additional sections
  meta: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
    </svg>
  `,
  logging: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `,
  browser: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="4"></circle>
      <line x1="21.17" y1="8" x2="12" y2="8"></line>
      <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
      <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
    </svg>
  `,
  ui: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
  `,
  models: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      ></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  `,
  bindings: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
      <line x1="6" y1="6" x2="6.01" y2="6"></line>
      <line x1="6" y1="18" x2="6.01" y2="18"></line>
    </svg>
  `,
  broadcast: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
      <circle cx="12" cy="12" r="2"></circle>
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
    </svg>
  `,
  audio: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>
  `,
  session: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `,
  cron: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  `,
  web: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      ></path>
    </svg>
  `,
  discovery: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `,
  canvasHost: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  `,
  talk: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  `,
  plugins: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v6"></path>
      <path d="m4.93 10.93 4.24 4.24"></path>
      <path d="M2 12h6"></path>
      <path d="m4.93 13.07 4.24-4.24"></path>
      <path d="M12 22v-6"></path>
      <path d="m19.07 13.07-4.24-4.24"></path>
      <path d="M22 12h-6"></path>
      <path d="m19.07 10.93-4.24 4.24"></path>
    </svg>
  `,
  diagnostics: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  `,
  cli: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  `,
  secrets: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"
      ></path>
    </svg>
  `,
  acp: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `,
  mcp: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
      <line x1="6" y1="6" x2="6.01" y2="6"></line>
      <line x1="6" y1="18" x2="6.01" y2="18"></line>
    </svg>
  `,
  __appearance__: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  `,
  __notifications__: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  `,
  default: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  `,
};

// Categorised section definitions
type SectionCategory = {
  id: string;
  label: string;
  sections: Array<{ key: string; label: string }>;
};

const SECTION_CATEGORIES: SectionCategory[] = [
  {
    id: "core",
    get label() {
      return t("rawUi.config_prop_e2f703fb9fc0");
    },
    sections: [
      {
        key: "env",
        get label() {
          return t("rawUi.config_prop_2f46573930ec");
        },
      },
      {
        key: "auth",
        get label() {
          return t("rawUi.config_prop_b00d839d2b1a");
        },
      },
      {
        key: "update",
        get label() {
          return t("rawUi.config_prop_f9b482913e11");
        },
      },
      {
        key: "meta",
        get label() {
          return t("rawUi.config_prop_8087674edebc");
        },
      },
      {
        key: "logging",
        get label() {
          return t("rawUi.config_prop_1b232fb0e6da");
        },
      },
      {
        key: "diagnostics",
        get label() {
          return t("rawUi.config_prop_b737ebfffd32");
        },
      },
      {
        key: "cli",
        get label() {
          return t("rawUi.config_prop_588d13776d39");
        },
      },
      {
        key: "secrets",
        get label() {
          return t("rawUi.config_prop_f528668a270c");
        },
      },
    ],
  },
  {
    id: "ai",
    get label() {
      return t("rawUi.config_prop_e727b8b0c39a");
    },
    sections: [
      {
        key: "agents",
        get label() {
          return t("rawUi.config_prop_9f436a0f4b3a");
        },
      },
      {
        key: "models",
        get label() {
          return t("rawUi.config_prop_e21082a5da20");
        },
      },
      {
        key: "skills",
        get label() {
          return t("rawUi.config_prop_8aa05d8fa26b");
        },
      },
      {
        key: "tools",
        get label() {
          return t("rawUi.config_prop_859e488191d5");
        },
      },
      {
        key: "memory",
        get label() {
          return t("rawUi.config_prop_d619afa66a8d");
        },
      },
      {
        key: "session",
        get label() {
          return t("rawUi.config_prop_388afd56a6ad");
        },
      },
    ],
  },
  {
    id: "communication",
    get label() {
      return t("rawUi.config_prop_fe3a27b51899");
    },
    sections: [
      {
        key: "channels",
        get label() {
          return t("rawUi.config_prop_a1ac6e04c1b4");
        },
      },
      {
        key: "messages",
        get label() {
          return t("rawUi.config_prop_cd8c8718112e");
        },
      },
      {
        key: "broadcast",
        get label() {
          return t("rawUi.config_prop_6815801eacc8");
        },
      },
      {
        key: "__notifications__",
        get label() {
          return t("rawUi.config_prop_49cdd44933c6");
        },
      },
      {
        key: "talk",
        get label() {
          return t("rawUi.config_prop_ba9b88f984bb");
        },
      },
      {
        key: "audio",
        get label() {
          return t("rawUi.config_prop_fcbd3e4975aa");
        },
      },
    ],
  },
  {
    id: "automation",
    get label() {
      return t("rawUi.config_prop_43bbb24b9fbc");
    },
    sections: [
      {
        key: "commands",
        get label() {
          return t("rawUi.config_prop_f319e79779d9");
        },
      },
      {
        key: "hooks",
        get label() {
          return t("rawUi.config_prop_11c3612d078b");
        },
      },
      {
        key: "bindings",
        get label() {
          return t("rawUi.config_prop_f0e516d8ab7a");
        },
      },
      {
        key: "cron",
        get label() {
          return t("rawUi.config_prop_0bdb0c4842ea");
        },
      },
      {
        key: "approvals",
        get label() {
          return t("rawUi.config_prop_50090928668c");
        },
      },
      {
        key: "plugins",
        get label() {
          return t("rawUi.config_prop_33c04f801116");
        },
      },
    ],
  },
  {
    id: "infrastructure",
    get label() {
      return t("rawUi.config_prop_496ce6f62db4");
    },
    sections: [
      {
        key: "gateway",
        get label() {
          return t("rawUi.config_prop_4b3b3a136f62");
        },
      },
      {
        key: "web",
        get label() {
          return t("rawUi.config_prop_598de2c5fd4d");
        },
      },
      {
        key: "browser",
        get label() {
          return t("rawUi.config_prop_8986d10297c2");
        },
      },
      {
        key: "nodeHost",
        get label() {
          return t("rawUi.config_prop_e3c29a67ff1f");
        },
      },
      {
        key: "canvasHost",
        get label() {
          return t("rawUi.config_prop_5b7c990e8d65");
        },
      },
      {
        key: "discovery",
        get label() {
          return t("rawUi.config_prop_810a60c46739");
        },
      },
      {
        key: "media",
        get label() {
          return t("rawUi.config_prop_53c1bab8944f");
        },
      },
      {
        key: "acp",
        get label() {
          return t("rawUi.config_prop_d32123120138");
        },
      },
      {
        key: "mcp",
        get label() {
          return t("rawUi.config_prop_4883cf1743c1");
        },
      },
    ],
  },
  {
    id: "appearance",
    label: t("tabs.appearance"),
    sections: [
      {
        key: "__appearance__",
        get label() {
          return t("rawUi.config_prop_2849fc5121ca");
        },
      },
      {
        key: "ui",
        get label() {
          return t("rawUi.config_prop_c4e508c5aae0");
        },
      },
      {
        key: "wizard",
        get label() {
          return t("rawUi.config_prop_7371e73a8c60");
        },
      },
    ],
  },
];

// Flat lookup: all categorised keys
const CATEGORISED_KEYS = new Set(SECTION_CATEGORIES.flatMap((c) => c.sections.map((s) => s.key)));

function getSectionIcon(key: string) {
  return sidebarIcons[key as keyof typeof sidebarIcons] ?? sidebarIcons.default;
}

function scopeSchemaSections(
  schema: JsonSchema | null,
  params: { include?: ReadonlySet<string> | null; exclude?: ReadonlySet<string> | null },
): JsonSchema | null {
  if (!schema || schemaType(schema) !== "object" || !schema.properties) {
    return schema;
  }
  const include = params.include;
  const exclude = params.exclude;
  const nextProps: Record<string, JsonSchema> = {};
  for (const key of Object.keys(schema.properties)) {
    if (include && include.size > 0 && !include.has(key)) {
      continue;
    }
    if (exclude && exclude.size > 0 && exclude.has(key)) {
      continue;
    }
    nextProps[key] = schema.properties[key];
  }
  return { ...schema, properties: nextProps };
}

function asConfigSchema(value: unknown): JsonSchema | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonSchema;
}

function resolveSectionMeta(
  key: string,
  schema?: JsonSchema,
): {
  label: string;
  description?: string;
} {
  const meta = SECTION_META[key];
  if (meta) {
    return meta;
  }
  return {
    label: schema?.title ?? humanize(key),
    description: schema?.description ?? "",
  };
}

const MAX_CONFIG_DIFF_DEPTH = 64;
const MAX_CONFIG_DIFF_NODES = 20_000;
const MAX_CONFIG_DIFF_CHANGES = 1_000;
const MAX_CONFIG_DIFF_ARRAY_COMPARE_ITEMS = 2_000;
const MAX_RAW_DIFF_CHARS = 200_000;

type ConfigDiffPath = string[];
type ConfigDiffEntry = { path: ConfigDiffPath; from: unknown; to: unknown };

let rawDiffCache:
  | {
      original: string;
      current: string;
      diff: ConfigDiffEntry[];
    }
  | undefined;

function formatConfigDiffPath(path: ConfigDiffPath): string {
  return path.length > 0 ? path.join(".") : "<root>";
}

function computeDiff(
  original: Record<string, unknown> | null,
  current: Record<string, unknown> | null,
): ConfigDiffEntry[] {
  if (!original || !current) {
    return [];
  }
  const changes: ConfigDiffEntry[] = [];
  let visited = 0;

  function pushChange(path: ConfigDiffPath, from: unknown, to: unknown) {
    if (changes.length < MAX_CONFIG_DIFF_CHANGES) {
      changes.push({ path, from, to });
    }
  }

  function arrayValuesDiffer(orig: unknown[], curr: unknown[], depth: number): boolean {
    if (orig.length !== curr.length) {
      return true;
    }
    if (orig.length > MAX_CONFIG_DIFF_ARRAY_COMPARE_ITEMS) {
      return true;
    }
    for (let index = 0; index < orig.length; index += 1) {
      if (valuesDiffer(orig[index], curr[index], depth + 1)) {
        return true;
      }
    }
    return false;
  }

  function objectValuesDiffer(
    orig: Record<string, unknown>,
    curr: Record<string, unknown>,
    depth: number,
  ): boolean {
    const origKeys = Object.keys(orig);
    const currKeys = Object.keys(curr);
    if (origKeys.length !== currKeys.length) {
      return true;
    }
    for (const key of origKeys) {
      if (!Object.hasOwn(curr, key) || valuesDiffer(orig[key], curr[key], depth + 1)) {
        return true;
      }
    }
    return false;
  }

  function valuesDiffer(orig: unknown, curr: unknown, depth: number): boolean {
    visited += 1;
    if (visited > MAX_CONFIG_DIFF_NODES || depth > MAX_CONFIG_DIFF_DEPTH) {
      return true;
    }
    if (orig === curr) {
      return false;
    }
    if (typeof orig !== typeof curr) {
      return true;
    }
    if (typeof orig !== "object" || orig === null || curr === null) {
      return orig !== curr;
    }
    if (Array.isArray(orig) || Array.isArray(curr)) {
      return Array.isArray(orig) && Array.isArray(curr)
        ? arrayValuesDiffer(orig, curr, depth + 1)
        : true;
    }
    return objectValuesDiffer(
      orig as Record<string, unknown>,
      curr as Record<string, unknown>,
      depth + 1,
    );
  }

  function compare(orig: unknown, curr: unknown, path: ConfigDiffPath, depth: number) {
    visited += 1;
    if (
      visited > MAX_CONFIG_DIFF_NODES ||
      depth > MAX_CONFIG_DIFF_DEPTH ||
      changes.length >= MAX_CONFIG_DIFF_CHANGES
    ) {
      return;
    }
    if (orig === curr) {
      return;
    }
    if (typeof orig !== typeof curr) {
      pushChange(path, orig, curr);
      return;
    }
    if (typeof orig !== "object" || orig === null || curr === null) {
      if (orig !== curr) {
        pushChange(path, orig, curr);
      }
      return;
    }
    if (Array.isArray(orig) || Array.isArray(curr)) {
      if (Array.isArray(orig) && Array.isArray(curr) && arrayValuesDiffer(orig, curr, depth + 1)) {
        pushChange(path, orig, curr);
      } else if (!Array.isArray(orig) || !Array.isArray(curr)) {
        pushChange(path, orig, curr);
      }
      return;
    }
    const origObj = orig as Record<string, unknown>;
    const currObj = curr as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(origObj), ...Object.keys(currObj)]);
    for (const key of allKeys) {
      compare(origObj[key], currObj[key], [...path, key], depth + 1);
    }
  }

  compare(original, current, [], 0);
  return changes;
}

function computeRawDiff(original: string, current: string): ConfigDiffEntry[] {
  if (rawDiffCache?.original === original && rawDiffCache.current === current) {
    return rawDiffCache.diff;
  }
  if (original.length > MAX_RAW_DIFF_CHARS || current.length > MAX_RAW_DIFF_CHARS) {
    rawDiffCache = { original, current, diff: [] };
    return rawDiffCache.diff;
  }
  try {
    const originalValue = JSON5.parse(original) as unknown;
    const currentValue = JSON5.parse(current) as unknown;
    if (
      !originalValue ||
      !currentValue ||
      typeof originalValue !== "object" ||
      typeof currentValue !== "object" ||
      Array.isArray(originalValue) ||
      Array.isArray(currentValue)
    ) {
      rawDiffCache = { original, current, diff: [] };
      return [];
    }
    const diff = computeDiff(
      originalValue as Record<string, unknown>,
      currentValue as Record<string, unknown>,
    );
    rawDiffCache = { original, current, diff };
    return diff;
  } catch {
    rawDiffCache = { original, current, diff: [] };
    return [];
  }
}

function truncateValue(value: unknown, maxLen = 40): string {
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  }
  let str: string;
  try {
    const json = JSON.stringify(value);
    str = json ?? String(value);
  } catch {
    str = String(value);
  }
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - 3) + "...";
}

function renderDiffValue(path: ConfigDiffPath, value: unknown, _uiHints: ConfigUiHints): string {
  if (
    isSensitiveConfigPath(formatConfigDiffPath(path)) &&
    value != null &&
    truncateValue(value).trim() !== ""
  ) {
    return REDACTED_PLACEHOLDER;
  }
  return truncateValue(value);
}

function hintKeyMatchesPathPrefix(hintKey: string, path: ConfigDiffPath): boolean {
  const hintSegments = hintKey.split(".");
  if (hintSegments.length !== path.length) {
    return false;
  }
  return hintSegments.every((segment, index) => segment === "*" || segment === path[index]);
}

function hasSensitiveHintForPathPrefix(path: ConfigDiffPath, uiHints: ConfigUiHints): boolean {
  return Object.entries(uiHints).some(
    ([hintKey, hint]) => Boolean(hint.sensitive) && hintKeyMatchesPathPrefix(hintKey, path),
  );
}

function isSensitiveDiffPath(path: ConfigDiffPath, uiHints: ConfigUiHints): boolean {
  for (let index = 1; index <= path.length; index += 1) {
    const prefix = path.slice(0, index);
    const key = formatConfigDiffPath(prefix);
    if (
      (hintForPath(prefix, uiHints)?.sensitive ?? false) ||
      hasSensitiveHintForPathPrefix(prefix, uiHints) ||
      isSensitiveConfigPath(key)
    ) {
      return true;
    }
  }
  return false;
}

function renderRawDiffValue(
  path: ConfigDiffPath,
  value: unknown,
  uiHints: ConfigUiHints,
  rawRevealed: boolean,
): string {
  const hasSensitiveValue = countSensitiveConfigValues(value, path, uiHints) > 0;
  if (!rawRevealed && value != null && (isSensitiveDiffPath(path, uiHints) || hasSensitiveValue)) {
    return REDACTED_PLACEHOLDER;
  }
  return truncateValue(value);
}

type ThemeOption = {
  id: ThemeName;
  label: string;
  description: string;
  icon: TemplateResult;
};
const BUILTIN_THEME_OPTIONS: ThemeOption[] = [
  {
    id: "claw",
    get label() {
      return t("rawUi.config_prop_e57b8ba8299e");
    },
    get description() {
      return t("rawUi.config_prop_fbc669a5720a");
    },
    icon: icons.zap,
  },
  {
    id: "knot",
    get label() {
      return t("rawUi.config_prop_ed7f79c2485e");
    },
    get description() {
      return t("rawUi.config_prop_d5294dfcea78");
    },
    icon: icons.link,
  },
  {
    id: "dash",
    get label() {
      return t("rawUi.config_prop_2422292782b6");
    },
    get description() {
      return t("rawUi.config_prop_ff8b6aab8a21");
    },
    icon: icons.barChart,
  },
];

function importedThemeName(props: Pick<ConfigProps, "hasCustomTheme" | "customThemeLabel">) {
  return props.hasCustomTheme && props.customThemeLabel
    ? props.customThemeLabel
    : t("rawUi.config_quick_importedTheme");
}

function focusCustomThemeImportInput() {
  const schedule =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);
  schedule(() => {
    const input = globalThis.document?.querySelector<HTMLInputElement>(
      "[data-custom-theme-import-input]",
    );
    if (!input) {
      return;
    }
    if (typeof input.scrollIntoView === "function") {
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    input.focus();
    input.select();
  });
}

function renderNotificationsSection(props: ConfigProps) {
  const push = props.webPush;
  if (!push) {
    return html`
      <div class="settings-notifications">
        <section class="settings-notifications__card">
          <div class="settings-notifications__header">
            <span class="settings-notifications__icon">${getSectionIcon("__notifications__")}</span>
            <div class="settings-notifications__copy">
              <h3 class="settings-notifications__title">${t("rawUi.config_text_061718a963f2")}</h3>
              <p class="settings-notifications__hint">${t("rawUi.config_text_a5338d386abe")}</p>
            </div>
            <span class="settings-notifications__badge settings-notifications__badge--muted">
              ${t("rawUi.config_text_1e7284febf81")}
            </span>
          </div>
        </section>
      </div>
    `;
  }

  const permissionLabel =
    push.permission === "granted"
      ? t("rawUi.config_notifications_granted")
      : push.permission === "denied"
        ? t("rawUi.config_notifications_denied")
        : push.permission === "default"
          ? t("rawUi.config_notifications_notRequested")
          : t("rawUi.config_notifications_unsupported");
  const subscriptionLabel = push.subscribed
    ? t("rawUi.config_notifications_subscribed")
    : t("rawUi.config_notifications_notSubscribed");
  const badgeLabel = !push.supported
    ? t("rawUi.config_notifications_unsupported")
    : push.permission === "denied"
      ? t("rawUi.config_notifications_blocked")
      : push.subscribed
        ? t("rawUi.config_notifications_subscribed")
        : t("rawUi.config_notifications_ready");
  const badgeTone = !push.supported
    ? "settings-notifications__badge--muted"
    : push.permission === "denied"
      ? "settings-notifications__badge--danger"
      : push.subscribed
        ? "settings-notifications__badge--ok"
        : "settings-notifications__badge--accent";

  return html`
    <div class="settings-notifications">
      <section class="settings-notifications__card">
        <div class="settings-notifications__header">
          <span class="settings-notifications__icon">${getSectionIcon("__notifications__")}</span>
          <div class="settings-notifications__copy">
            <h3 class="settings-notifications__title">${t("rawUi.config_text_061718a963f2")}</h3>
            <p class="settings-notifications__hint">${t("rawUi.config_text_f90fe12f4008")}</p>
          </div>
          <span class="settings-notifications__badge ${badgeTone}">${badgeLabel}</span>
        </div>

        <div class="settings-notifications__body">
          <div class="settings-notifications__details">
            <div class="settings-notifications__detail">
              <span class="settings-notifications__label"
                >${t("rawUi.config_text_750a89eb7469")}</span
              >
              <span class="settings-notifications__value">
                ${push.supported ? "Available" : t("rawUi.config_dynamic_62da77834173")}
              </span>
            </div>
            <div class="settings-notifications__detail">
              <span class="settings-notifications__label"
                >${t("rawUi.config_text_2a2332b84566")}</span
              >
              <span class="settings-notifications__value">${permissionLabel}</span>
            </div>
            <div class="settings-notifications__detail">
              <span class="settings-notifications__label"
                >${t("rawUi.config_text_f36e61d38988")}</span
              >
              <span class="settings-notifications__value settings-notifications__value--status">
                <span
                  class="settings-notifications__dot ${push.subscribed
                    ? "settings-notifications__dot--ok"
                    : ""}"
                ></span>
                ${subscriptionLabel}
              </span>
            </div>
          </div>

          <div class="settings-notifications__actions">
            ${push.supported && push.permission !== "denied"
              ? push.subscribed
                ? html`
                    <button
                      class="btn"
                      ?disabled=${push.loading || !props.connected}
                      @click=${() => props.onWebPushUnsubscribe?.()}
                    >
                      ${icons.x} ${t("rawUi.config_fragment_49a9bfefb716")}
                    </button>
                    <button
                      class="btn primary"
                      ?disabled=${push.loading || !props.connected}
                      @click=${() => props.onWebPushTest?.()}
                    >
                      ${icons.send} ${t("rawUi.config_fragment_ae5c3d6700c1")}
                    </button>
                  `
                : html`
                    <button
                      class="btn primary"
                      ?disabled=${push.loading || !props.connected}
                      @click=${() => props.onWebPushSubscribe?.()}
                    >
                      ${push.loading ? icons.loader : getSectionIcon("__notifications__")}
                      ${push.loading
                        ? t("rawUi.config_dynamic_ebb5e0f419ba")
                        : t("rawUi.config_dynamic_332c9efce65f")}
                    </button>
                  `
              : push.permission === "denied"
                ? html`
                    <div class="settings-notifications__callout">
                      ${t("rawUi.config_text_5bc52288a000")}
                    </div>
                  `
                : nothing}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderAppearanceSection(props: ConfigProps) {
  const showCustomThemeImport = props.hasCustomTheme || props.customThemeImportExpanded === true;
  if (
    showCustomThemeImport &&
    props.customThemeImportFocusToken != null &&
    props.customThemeImportFocusToken !== cvs.lastCustomThemeImportFocusToken
  ) {
    cvs.lastCustomThemeImportFocusToken = props.customThemeImportFocusToken;
    focusCustomThemeImportInput();
  }
  const importedName = importedThemeName(props);
  const themeOptions: ThemeOption[] = [
    ...BUILTIN_THEME_OPTIONS,
    {
      id: "custom",
      label: props.hasCustomTheme ? importedName : t("rawUi.config_quick_import"),
      description: props.hasCustomTheme
        ? `Imported from tweakcn: ${importedName}`
        : t("rawUi.config_importThemeDescription"),
      icon: icons.spark,
    },
  ];
  return html`
    <div class="settings-appearance">
      <div class="settings-appearance__section">
        <h3 class="settings-appearance__heading">${t("rawUi.config_text_666c919f4c73")}</h3>
        <p class="settings-appearance__hint">${t("rawUi.config_text_cc8d8503110a")}</p>
        <div class="settings-theme-grid">
          ${themeOptions.map(
            (opt) => html`
              <button
                class="settings-theme-card ${opt.id === props.theme
                  ? "settings-theme-card--active"
                  : ""}"
                title=${opt.description}
                @click=${(e: Event) => {
                  if (opt.id === "custom" && !props.hasCustomTheme) {
                    props.onOpenCustomThemeImport?.();
                    return;
                  }
                  if (opt.id !== props.theme) {
                    const context: ThemeTransitionContext = {
                      element: (e.currentTarget as HTMLElement) ?? undefined,
                    };
                    props.setTheme(opt.id, context);
                  }
                }}
              >
                <span class="settings-theme-card__icon" aria-hidden="true">${opt.icon}</span>
                <span class="settings-theme-card__label">${opt.label}</span>
                ${opt.id === props.theme
                  ? html`<span class="settings-theme-card__check" aria-hidden="true"
                      >${icons.check}</span
                    >`
                  : nothing}
              </button>
            `,
          )}
        </div>
        ${showCustomThemeImport
          ? html`
              <div class="settings-theme-import">
                <div class="settings-theme-import__copy">
                  <div class="settings-theme-import__title">
                    ${t("rawUi.config_text_0a4696d1bf9f")}
                  </div>
                  <p class="settings-theme-import__hint">${t("rawUi.config_text_2782fb45879c")}</p>
                </div>
                <a
                  class="settings-theme-import__external"
                  href="https://tweakcn.com/editor/theme"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ${t("rawUi.config_fragment_698b2bf8211b")} ${icons.externalLink}
                </a>
                <label class="settings-theme-import__field">
                  <span class="settings-theme-import__label"
                    >${t("rawUi.config_text_9e9e11688aea")}</span
                  >
                  <input
                    class="settings-theme-import__input"
                    data-custom-theme-import-input
                    type="text"
                    spellcheck="false"
                    placeholder=${t("rawUi.config_attr_5a1d1d22d24e")}
                    .value=${props.customThemeImportUrl}
                    @input=${(e: Event) =>
                      props.onCustomThemeImportUrlChange(
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                  />
                </label>
                <div class="settings-theme-import__actions">
                  <button
                    class="btn btn--sm primary"
                    ?disabled=${props.customThemeImportBusy ||
                    props.customThemeImportUrl.trim().length === 0}
                    @click=${props.onImportCustomTheme}
                  >
                    ${props.customThemeImportBusy
                      ? "Importing…"
                      : props.hasCustomTheme
                        ? t("rawUi.config_dynamic_replaceTheme", { name: importedName })
                        : t("rawUi.config_dynamic_ddd4a8e53f9d")}
                  </button>
                  ${props.hasCustomTheme
                    ? html`
                        <button class="btn btn--sm danger" @click=${props.onClearCustomTheme}>
                          ${t("rawUi.config_fragment_aa38d98ccb7a")} ${importedName}
                        </button>
                      `
                    : nothing}
                </div>
                ${props.hasCustomTheme
                  ? html`
                      <div class="settings-theme-import__meta">
                        <span class="settings-theme-import__meta-label"
                          >${t("rawUi.config_text_a3799d002f07")}</span
                        >
                        <span class="settings-theme-import__meta-value"
                          >${importedName} · ${props.customThemeSourceUrl ?? "tweakcn"}</span
                        >
                      </div>
                    `
                  : nothing}
                ${props.customThemeImportMessage
                  ? html`
                      <div
                        class="settings-theme-import__message settings-theme-import__message--${props
                          .customThemeImportMessage.kind}"
                      >
                        ${props.customThemeImportMessage.text}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : html`
              <p class="settings-theme-import__inline-hint">
                ${t("rawUi.config_text_7973ed5dbbc6")}
                <strong>${t("rawUi.config_text_f9ad5a3236b5")}</strong> ${t(
                  "rawUi.config_text_814eb1c2c71d",
                )}
              </p>
            `}
      </div>

      <div class="settings-appearance__section">
        <h3 class="settings-appearance__heading">${t("rawUi.config_text_f1d862c4c5d7")}</h3>
        <p class="settings-appearance__hint">${t("rawUi.config_text_2b6c4b706010")}</p>
        <div class="settings-roundness">
          <div class="settings-roundness__options">
            ${BORDER_RADIUS_STOPS.map(
              (stop) => html`
                <button
                  type="button"
                  class="settings-roundness__btn ${stop === props.borderRadius ? "active" : ""}"
                  @click=${() => props.setBorderRadius(stop)}
                >
                  <span
                    class="settings-roundness__swatch"
                    style="border-radius: ${Math.round(10 * (stop / 50))}px"
                  ></span>
                  <span class="settings-roundness__label">${BORDER_RADIUS_LABELS[stop]}</span>
                </button>
              `,
            )}
          </div>
        </div>
      </div>

      <div class="settings-appearance__section">
        <h3 class="settings-appearance__heading">${t("rawUi.config_text_8a1132c1ec18")}</h3>
        <div class="settings-text-scale">
          <div class="settings-text-scale__options">
            ${TEXT_SCALE_STOPS.map(
              (stop) => html`
                <button
                  type="button"
                  class="settings-text-scale__btn ${stop === props.textScale ? "active" : ""}"
                  @click=${() => props.setTextScale(stop)}
                >
                  <span class="settings-text-scale__sample">${TEXT_SCALE_LABELS[stop]}</span>
                  <span class="settings-text-scale__label">${stop}%</span>
                </button>
              `,
            )}
          </div>
        </div>
      </div>

      <div class="settings-appearance__section">
        <h3 class="settings-appearance__heading">${t("rawUi.config_text_845b7a0dbbd1")}</h3>
        <div class="settings-info-grid">
          <div class="settings-info-row">
            <span class="settings-info-row__label">${t("rawUi.config_text_f9707ca5b7d7")}</span>
            <span class="settings-info-row__value mono">${props.gatewayUrl || "-"}</span>
          </div>
          <div class="settings-info-row">
            <span class="settings-info-row__label">${t("rawUi.config_text_f36e61d38988")}</span>
            <span class="settings-info-row__value">
              <span
                class="settings-status-dot ${props.connected ? "settings-status-dot--ok" : ""}"
              ></span>
              ${props.connected ? t("common.connected") : t("common.offline")}
            </span>
          </div>
          ${props.assistantName
            ? html`
                <div class="settings-info-row">
                  <span class="settings-info-row__label"
                    >${t("rawUi.config_text_600e167f204d")}</span
                  >
                  <span class="settings-info-row__value">${props.assistantName}</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    </div>
  `;
}

interface ConfigEphemeralState {
  rawRevealed: boolean;
  rawDiffOpen: boolean;
  envRevealed: boolean;
  validityDismissed: boolean;
  revealedSensitivePaths: Set<string>;
  lastCustomThemeImportFocusToken: number | null;
}

function createConfigEphemeralState(): ConfigEphemeralState {
  return {
    rawRevealed: false,
    rawDiffOpen: false,
    envRevealed: false,
    validityDismissed: false,
    revealedSensitivePaths: new Set(),
    lastCustomThemeImportFocusToken: null,
  };
}

const cvs = createConfigEphemeralState();
let lastConfigContextKey: string | null = null;
let lastFormModeForScroll: ConfigProps["formMode"] | null = null;

function resetConfigEphemeralState() {
  Object.assign(cvs, createConfigEphemeralState());
  rawDiffCache = undefined;
}

function configContextKey(props: ConfigProps): string {
  const include = props.includeSections?.join("\u001f") ?? "";
  const exclude = props.excludeSections?.join("\u001f") ?? "";
  return [
    props.configPath ?? "",
    props.gatewayUrl,
    props.navRootLabel ?? "",
    include,
    exclude,
  ].join("\u001e");
}

function isSensitivePathRevealed(path: Array<string | number>): boolean {
  const key = pathKey(path);
  return key ? cvs.revealedSensitivePaths.has(key) : false;
}

function toggleSensitivePathReveal(path: Array<string | number>) {
  const key = pathKey(path);
  if (!key) {
    return;
  }
  if (cvs.revealedSensitivePaths.has(key)) {
    cvs.revealedSensitivePaths.delete(key);
  } else {
    cvs.revealedSensitivePaths.add(key);
  }
}

export function resetConfigViewStateForTests() {
  resetConfigEphemeralState();
  lastConfigContextKey = null;
  lastFormModeForScroll = null;
}

export function renderConfig(props: ConfigProps) {
  const showModeToggle = props.showModeToggle ?? false;
  const showRootTab = props.showRootTab ?? true;
  const validity = props.valid == null ? "unknown" : props.valid ? "valid" : "invalid";
  const includeVirtualSections = props.includeVirtualSections ?? true;
  const include = props.includeSections?.length ? new Set(props.includeSections) : null;
  const exclude = props.excludeSections?.length ? new Set(props.excludeSections) : null;
  const scopedSchema = scopeSchemaSections(asConfigSchema(props.schema), { include, exclude });
  const analysis = analyzeConfigSchema(scopedSchema);
  const formUnsafe = analysis.schema ? analysis.unsupportedPaths.length > 0 : false;
  const rawAvailable = props.rawAvailable ?? true;
  const formMode = showModeToggle && rawAvailable ? props.formMode : "form";
  const requestUpdate = props.onRequestUpdate ?? (() => {});
  // Scroll helper: target-based (nav clicks) with global fallback (form/raw toggle)
  const resetContentScroll = (target: EventTarget | null) => {
    queueMicrotask(() => {
      const origin = target instanceof Element ? target : null;
      const content =
        origin?.closest(".config-main")?.querySelector<HTMLElement>(".config-content") ??
        globalThis.document?.querySelector<HTMLElement>(".config-content");
      if (!content) {
        return;
      }
      if (typeof content.scrollTo === "function") {
        content.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }
      content.scrollTop = 0;
      content.scrollLeft = 0;
    });
  };

  // Reset scroll position when switching between form and raw mode
  if (lastFormModeForScroll !== null && lastFormModeForScroll !== formMode) {
    resetContentScroll(null);
  }
  lastFormModeForScroll = formMode;

  const currentContextKey = configContextKey(props);
  if (lastConfigContextKey !== currentContextKey) {
    resetConfigEphemeralState();
    lastConfigContextKey = currentContextKey;
  }
  const envSensitiveVisible = cvs.envRevealed;

  // Build categorised nav from schema - only include sections that exist in the schema
  const schemaProps = analysis.schema?.properties ?? {};

  const VIRTUAL_SECTIONS = new Set(["__appearance__", "__notifications__"]);
  const isVisibleVirtualSection = (key: string) =>
    includeVirtualSections &&
    VIRTUAL_SECTIONS.has(key) &&
    (key === "__appearance__" || include?.has(key) === true);
  const visibleCategories = SECTION_CATEGORIES.map((cat) =>
    Object.assign({}, cat, {
      sections: cat.sections.filter(
        (s) =>
          (isVisibleVirtualSection(s.key) || s.key in schemaProps) &&
          (!include || include.has(s.key)) &&
          (!exclude || !exclude.has(s.key)),
      ),
    }),
  ).filter((cat) => cat.sections.length > 0);

  // Catch any schema keys not in our categories
  const extraSections = Object.keys(schemaProps)
    .filter((k) => !CATEGORISED_KEYS.has(k))
    .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }));

  const otherCategory: SectionCategory | null =
    extraSections.length > 0
      ? { id: "other", label: t("rawUi.config_prop_cddeb8f60693"), sections: extraSections }
      : null;

  const isVirtualSection =
    includeVirtualSections &&
    props.activeSection != null &&
    VIRTUAL_SECTIONS.has(props.activeSection);
  const activeSectionSchema =
    props.activeSection &&
    !isVirtualSection &&
    analysis.schema &&
    schemaType(analysis.schema) === "object"
      ? analysis.schema.properties?.[props.activeSection]
      : undefined;
  const activeSectionMeta =
    props.activeSection && !isVirtualSection
      ? resolveSectionMeta(props.activeSection, activeSectionSchema)
      : null;
  // Config subsections are always rendered as a single page per section.
  const effectiveSubsection = null;

  const topTabs = [
    ...(showRootTab
      ? [{ key: null as string | null, label: props.navRootLabel ?? "Settings" }]
      : []),
    ...[...visibleCategories, ...(otherCategory ? [otherCategory] : [])].flatMap((cat) =>
      cat.sections.map((s) => ({ key: s.key, label: s.label })),
    ),
  ];

  const settingsLayout = props.settingsLayout ?? "tabs";
  const allCategories = [...visibleCategories, ...(otherCategory ? [otherCategory] : [])];

  function renderAccordionNav() {
    return html`
      <div class="config-accordion-nav">
        ${props.onBackToQuick
          ? html`
              <button class="config-accordion-nav__back" @click=${props.onBackToQuick}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  width="14"
                  height="14"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                ${t("rawUi.config_text_84879a451df9")}
              </button>
            `
          : nothing}
        ${allCategories.map(
          (cat) => html`
            <div class="config-accordion-group">
              <button
                class="config-accordion-group__header ${props.activeSection != null &&
                cat.sections.some((s) => s.key === props.activeSection)
                  ? "config-accordion-group__header--active"
                  : ""}"
                @click=${(e: Event) => {
                  const firstKey = cat.sections[0]?.key ?? null;
                  const isCurrentlyInGroup = cat.sections.some(
                    (s) => s.key === props.activeSection,
                  );
                  props.onSectionChange(isCurrentlyInGroup ? null : firstKey);
                  resetContentScroll(e.currentTarget);
                }}
              >
                <span class="config-accordion-group__icon">
                  ${getSectionIcon(cat.sections[0]?.key ?? "default")}
                </span>
                <span>${cat.label}</span>
                <svg
                  class="config-accordion-group__chevron ${cat.sections.some(
                    (s) => s.key === props.activeSection,
                  )
                    ? "config-accordion-group__chevron--open"
                    : ""}"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  width="14"
                  height="14"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              ${cat.sections.some((s) => s.key === props.activeSection)
                ? html`
                    <div class="config-accordion-group__items">
                      ${cat.sections.map(
                        (s) => html`
                          <button
                            class="config-accordion-group__item ${props.activeSection === s.key
                              ? "config-accordion-group__item--active"
                              : ""}"
                            @click=${(e: Event) => {
                              props.onSectionChange(s.key);
                              resetContentScroll(e.currentTarget);
                            }}
                          >
                            <span class="config-accordion-group__item-icon">
                              ${getSectionIcon(s.key)}
                            </span>
                            ${s.label}
                          </button>
                        `,
                      )}
                    </div>
                  `
                : nothing}
            </div>
          `,
        )}
      </div>
    `;
  }

  // Compute diff for showing changes (works for both form and raw modes)
  const diff = formMode === "form" ? computeDiff(props.originalValue, props.formValue) : [];
  const hasRawChanges = formMode === "raw" && props.raw !== props.originalRaw;
  if ((!hasRawChanges || formMode !== "raw") && cvs.rawDiffOpen) {
    cvs.rawDiffOpen = false;
  }
  if (!hasRawChanges || formMode !== "raw" || !cvs.rawDiffOpen) {
    rawDiffCache = undefined;
  }
  const rawDiff =
    formMode === "raw" && hasRawChanges && cvs.rawDiffOpen
      ? computeRawDiff(props.originalRaw, props.raw)
      : [];
  const hasChanges = formMode === "form" ? diff.length > 0 : hasRawChanges;

  // Save/apply buttons require actual changes to be enabled.
  // Note: formUnsafe warns about unsupported schema paths but shouldn't block saving.
  const canSaveForm = Boolean(props.formValue) && !props.loading && Boolean(analysis.schema);
  const canSave =
    props.connected && !props.saving && hasChanges && (formMode === "raw" ? true : canSaveForm);
  const canApply =
    props.connected &&
    !props.applying &&
    !props.updating &&
    hasChanges &&
    (formMode === "raw" ? true : canSaveForm);
  const canUpdate = props.connected && !props.applying && !props.updating;
  const renderActionButtonContent = (busy: boolean, label: string, busyLabel: string) =>
    busy
      ? html`<span class="config-action-spinner" aria-hidden="true">${icons.loader}</span
          >${busyLabel}`
      : label;

  const showAppearanceOnRoot =
    includeVirtualSections &&
    formMode === "form" &&
    props.activeSection === null &&
    Boolean(include?.has("__appearance__"));

  return html`
    <div class="config-layout">
      <main class="config-main">
        <div class="config-actions">
          <div class="config-actions__left">
            ${showModeToggle
              ? html`
                  <div class="config-mode-toggle">
                    <button
                      class="config-mode-toggle__btn ${formMode === "form" ? "active" : ""}"
                      ?disabled=${props.schemaLoading || !props.schema}
                      title=${formUnsafe ? t("rawUi.config_dynamic_ef75e0295bd3") : ""}
                      @click=${() => props.onFormModeChange("form")}
                    >
                      ${t("rawUi.config_text_f39c4bae9af7")}
                    </button>
                    <button
                      class="config-mode-toggle__btn ${formMode === "raw" ? "active" : ""}"
                      ?disabled=${!rawAvailable}
                      title=${rawAvailable
                        ? t("rawUi.config_dynamic_05f97f4a7ff7")
                        : t("rawUi.config_dynamic_d9f183ef13cd")}
                      @click=${() => props.onFormModeChange("raw")}
                    >
                      ${t("rawUi.config_text_a9a650ab01a1")}
                    </button>
                  </div>
                `
              : nothing}
            ${hasChanges
              ? html`
                  <span class="config-changes-badge"
                    >${formMode === "raw"
                      ? t("rawUi.config_dynamic_1c74fbc88e5b")
                      : t(
                          diff.length === 1
                            ? "rawUi.config_dynamic_unsavedChange"
                            : "rawUi.config_dynamic_unsavedChanges",
                          {
                            count: String(diff.length),
                          },
                        )}</span
                  >
                `
              : html`
                  <span class="config-status muted">${t("rawUi.config_text_c522c483c0d7")}</span>
                `}
          </div>
          <div class="config-actions__right">
            ${!rawAvailable
              ? html`
                  <span class="config-status muted config-actions__notice"
                    >${t("rawUi.config_text_0bae42bbe85f")}</span
                  >
                `
              : nothing}
            <div class="config-actions__buttons">
              ${props.onOpenFile
                ? html`
                    <button
                      class="btn btn--sm"
                      title=${props.configPath
                        ? t("rawUi.config_dynamic_openPath", { path: props.configPath })
                        : t("rawUi.config_dynamic_bd9aa8fddd36")}
                      @click=${props.onOpenFile}
                    >
                      ${icons.fileText} ${t("rawUi.config_fragment_28fd4bd90787")}
                    </button>
                  `
                : nothing}
              <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onReload}>
                ${props.loading ? t("common.loading") : t("common.reload")}
              </button>
              <button class="btn btn--sm" ?disabled=${!hasChanges} @click=${props.onReset}>
                ${t("rawUi.config_text_20eb9e251bc9")}
              </button>
              <button
                class="btn btn--sm primary"
                ?disabled=${!canSave}
                aria-busy=${props.saving ? "true" : "false"}
                @click=${props.onSave}
              >
                ${renderActionButtonContent(props.saving, "Save", "Saving…")}
              </button>
              <button
                class="btn btn--sm"
                ?disabled=${!canApply}
                aria-busy=${props.applying ? "true" : "false"}
                @click=${props.onApply}
              >
                ${renderActionButtonContent(props.applying, "Apply", "Applying…")}
              </button>
              <button
                class="btn btn--sm"
                ?disabled=${!canUpdate}
                aria-busy=${props.updating ? "true" : "false"}
                @click=${props.onUpdate}
              >
                ${renderActionButtonContent(props.updating, "Update", "Updating…")}
              </button>
            </div>
          </div>
        </div>

        ${settingsLayout === "accordion"
          ? renderAccordionNav()
          : html`
              <div class="config-top-tabs">
                ${formMode === "form"
                  ? html`
                      <div class="config-search config-search--top">
                        <div class="config-search__input-row">
                          <svg
                            class="config-search__icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                          </svg>
                          <input
                            type="text"
                            class="config-search__input"
                            placeholder=${t("rawUi.config_attr_8cd6e665d032")}
                            aria-label=${t("rawUi.config_attr_074687cfea8b")}
                            .value=${props.searchQuery}
                            @input=${(e: Event) =>
                              props.onSearchChange((e.target as HTMLInputElement).value)}
                          />
                          ${props.searchQuery
                            ? html`
                                <button
                                  class="config-search__clear"
                                  aria-label=${t("rawUi.config_attr_3587dacb3c30")}
                                  @click=${() => props.onSearchChange("")}
                                >
                                  ×
                                </button>
                              `
                            : nothing}
                        </div>
                      </div>
                    `
                  : nothing}

                <div
                  class="config-top-tabs__scroller"
                  role="tablist"
                  aria-label="${t("common.settingsSections")}"
                >
                  ${topTabs.map(
                    (tab) => html`
                      <button
                        class="config-top-tabs__tab ${props.activeSection === tab.key
                          ? "active"
                          : ""}"
                        role="tab"
                        aria-selected=${props.activeSection === tab.key}
                        @click=${(e: Event) => {
                          props.onSectionChange(tab.key);
                          resetContentScroll(e.currentTarget);
                        }}
                        title=${tab.label}
                      >
                        ${tab.label}
                      </button>
                    `,
                  )}
                </div>
              </div>
            `}
        ${validity === "invalid" && !cvs.validityDismissed
          ? html`
              <div class="config-validity-warning">
                <svg
                  class="config-validity-warning__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="16"
                  height="16"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  ></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span class="config-validity-warning__text"
                  >${t("rawUi.config_text_3d43ffef077e")}</span
                >
                <button
                  class="btn btn--sm"
                  @click=${() => {
                    cvs.validityDismissed = true;
                    requestUpdate();
                  }}
                >
                  ${t("rawUi.config_text_bb001c814045")}
                </button>
              </div>
            `
          : nothing}

        <!-- Diff panel -->
        ${hasChanges && formMode === "form"
          ? html`
              <details class="config-diff">
                <summary class="config-diff__summary">
                  <span
                    >${t("rawUi.config_fragment_4142959a9c7e")} ${diff.length}
                    ${t("rawUi.config_fragment_addd6315c6ea")}${diff.length !== 1 ? "s" : ""}</span
                  >
                  <svg
                    class="config-diff__chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div class="config-diff__content">
                  ${diff.map(
                    (change) => html`
                      <div class="config-diff__item">
                        <div class="config-diff__path">${formatConfigDiffPath(change.path)}</div>
                        <div class="config-diff__values">
                          <span class="config-diff__from"
                            >${renderDiffValue(change.path, change.from, props.uiHints)}</span
                          >
                          <span class="config-diff__arrow">→</span>
                          <span class="config-diff__to"
                            >${renderDiffValue(change.path, change.to, props.uiHints)}</span
                          >
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </details>
            `
          : nothing}
        ${hasRawChanges && formMode === "raw"
          ? html`
              <details
                class="config-diff"
                ?open=${cvs.rawDiffOpen}
                @toggle=${(e: Event) => {
                  const details = e.target as HTMLDetailsElement;
                  if (cvs.rawDiffOpen === details.open) {
                    return;
                  }
                  cvs.rawDiffOpen = details.open;
                  if (!details.open) {
                    rawDiffCache = undefined;
                  }
                  requestUpdate();
                }}
              >
                <summary class="config-diff__summary">
                  <span>${t("rawUi.config_text_7eb93890fbcd")}</span>
                  <svg
                    class="config-diff__chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div class="config-diff__content">
                  ${rawDiff.length > 0
                    ? rawDiff.map(
                        (change) => html`
                          <div class="config-diff__item">
                            <div class="config-diff__path">
                              ${formatConfigDiffPath(change.path)}
                            </div>
                            <div class="config-diff__values">
                              <span class="config-diff__from"
                                >${renderRawDiffValue(
                                  change.path,
                                  change.from,
                                  props.uiHints,
                                  cvs.rawRevealed,
                                )}</span
                              >
                              <span class="config-diff__arrow">→</span>
                              <span class="config-diff__to"
                                >${renderRawDiffValue(
                                  change.path,
                                  change.to,
                                  props.uiHints,
                                  cvs.rawRevealed,
                                )}</span
                              >
                            </div>
                          </div>
                        `,
                      )
                    : html`
                        <div class="config-diff__item">${t("rawUi.config_text_4781538a2619")}</div>
                      `}
                </div>
              </details>
            `
          : nothing}
        ${activeSectionMeta && formMode === "form"
          ? html`
              <div class="config-section-hero">
                <div class="config-section-hero__icon">
                  ${getSectionIcon(props.activeSection ?? "")}
                </div>
                <div class="config-section-hero__text">
                  <div class="config-section-hero__title">${activeSectionMeta.label}</div>
                  ${activeSectionMeta.description
                    ? html`<div class="config-section-hero__desc">
                        ${activeSectionMeta.description}
                      </div>`
                    : nothing}
                </div>
                ${props.activeSection === "env"
                  ? html`
                      <button
                        class="config-env-peek-btn ${envSensitiveVisible
                          ? "config-env-peek-btn--active"
                          : ""}"
                        title=${envSensitiveVisible
                          ? t("rawUi.config_dynamic_f6e38404d4b4")
                          : t("rawUi.config_dynamic_3877227902b2")}
                        @click=${() => {
                          cvs.envRevealed = !cvs.envRevealed;
                          requestUpdate();
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          width="16"
                          height="16"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        ${t("rawUi.config_text_46118aa8559f")}
                      </button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        <!-- Form content -->
        <div class="config-content">
          ${props.activeSection === "__appearance__"
            ? includeVirtualSections
              ? renderAppearanceSection(props)
              : nothing
            : props.activeSection === "__notifications__"
              ? includeVirtualSections
                ? renderNotificationsSection(props)
                : nothing
              : formMode === "form"
                ? html`
                    ${showAppearanceOnRoot ? renderAppearanceSection(props) : nothing}
                    ${props.schemaLoading
                      ? html`
                          <div class="config-loading">
                            <div class="config-loading__spinner"></div>
                            <span>${t("rawUi.config_text_2d233baa51c6")}</span>
                          </div>
                        `
                      : renderConfigForm({
                          schema: analysis.schema,
                          uiHints: props.uiHints,
                          value: props.formValue,
                          rawAvailable,
                          disabled: props.loading || !props.formValue,
                          unsupportedPaths: analysis.unsupportedPaths,
                          onPatch: props.onFormPatch,
                          searchQuery: props.searchQuery,
                          activeSection: props.activeSection,
                          activeSubsection: effectiveSubsection,
                          revealSensitive:
                            props.activeSection === "env" ? envSensitiveVisible : false,
                          isSensitivePathRevealed,
                          onToggleSensitivePath: (path) => {
                            toggleSensitivePathReveal(path);
                            requestUpdate();
                          },
                        })}
                  `
                : (() => {
                    const sensitiveCount = countSensitiveConfigValues(
                      props.formValue,
                      [],
                      props.uiHints,
                    );
                    const blurred = sensitiveCount > 0 && !cvs.rawRevealed;
                    return html`
                      ${formUnsafe
                        ? html`
                            <div class="callout info" style="margin-bottom: 12px">
                              ${t("rawUi.config_text_0c6ecf6d0cc3")}
                            </div>
                          `
                        : nothing}
                      <div class="field config-raw-field">
                        <span style="display:flex;align-items:center;gap:8px;">
                          ${t("rawUi.config_fragment_663e5c8e587d")}
                          ${sensitiveCount > 0
                            ? html`
                                <span class="pill pill--sm"
                                  >${sensitiveCount}
                                  ${t("rawUi.config_fragment_40f390488df7")}${sensitiveCount === 1
                                    ? ""
                                    : "s"}
                                  ${blurred ? "redacted" : "visible"}</span
                                >
                                <button
                                  class="btn btn--icon config-raw-toggle ${blurred ? "" : "active"}"
                                  title=${blurred
                                    ? t("rawUi.config_dynamic_fc634eabba54")
                                    : t("rawUi.config_dynamic_584aae6ac0ed")}
                                  aria-label=${t("rawUi.config_attr_fa101828b40f")}
                                  aria-pressed=${!blurred}
                                  @click=${() => {
                                    cvs.rawRevealed = !cvs.rawRevealed;
                                    requestUpdate();
                                  }}
                                >
                                  ${blurred ? icons.eyeOff : icons.eye}
                                </button>
                              `
                            : nothing}
                        </span>
                        ${blurred
                          ? html`
                              <div class="callout info" style="margin-top: 12px">
                                ${sensitiveCount}
                                ${t("rawUi.config_fragment_11aa75ca887c")}${sensitiveCount === 1
                                  ? ""
                                  : "s"}
                                ${t("rawUi.config_fragment_086df47e9ece")}
                              </div>
                            `
                          : html`
                              <textarea
                                placeholder=${t("rawUi.config_attr_75b3a82b50bc")}
                                .value=${props.raw}
                                @input=${(e: Event) => {
                                  props.onRawChange((e.target as HTMLTextAreaElement).value);
                                }}
                              ></textarea>
                            `}
                      </div>
                    `;
                  })()}
        </div>

        ${props.issues.length > 0
          ? html`<div class="callout danger" style="margin-top: 12px;">
              <pre class="code-block">${JSON.stringify(props.issues, null, 2)}</pre>
            </div>`
          : nothing}
      </main>
    </div>
  `;
}
