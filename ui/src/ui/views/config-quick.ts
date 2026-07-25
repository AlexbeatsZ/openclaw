/**
 * Quick Settings view — opinionated card layout for the most common settings.
 * Replaces the raw schema-driven form as the default settings experience.
 *
 * Each card answers a "what do I want to do?" question with status + actions.
 */

import { html, nothing, type TemplateResult } from "lit";
import { formatFastModeValue } from "../../../../src/shared/fast-mode.js";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { BorderRadiusStop, TextScaleStop } from "../storage.ts";
import { normalizeOptionalString } from "../string-coerce.ts";
import type { ThemeTransitionContext } from "../theme-transition.ts";
import type { ThemeMode, ThemeName } from "../theme.ts";
import type { FastMode } from "../types.ts";
import {
  normalizeLocalUserIdentity,
  resolveLocalUserAvatarText,
  resolveLocalUserAvatarUrl,
} from "../user-identity.ts";
import {
  assistantAvatarFallbackUrl,
  resolveChatAvatarRenderUrl,
  resolveAssistantTextAvatar,
} from "./agents-utils.ts";
import {
  CONFIG_PRESETS,
  detectActivePreset,
  getPresetById,
  type ConfigPresetId,
} from "./config-presets.ts";

// ── Types ──

export type QuickSettingsChannel = {
  id: string;
  label: string;
  connected: boolean;
  detail?: string;
};

export type QuickSettingsAutomation = {
  cronJobCount: number;
  directDeliveryJobCount: number;
  skillCount: number;
  mcpServerCount: number;
};

export type QuickSettingsSecurity = {
  gatewayAuth: string;
  execPolicy: string;
  deviceAuth: boolean;
  browserEnabled: boolean;
  toolProfile: string;
};

export type QuickSettingsProps = {
  // Model & Thinking
  currentModel: string;
  thinkingLevel: string;
  fastMode: FastMode | undefined;
  onModelChange?: () => void;
  onThinkingChange?: (level: string) => void;
  onFastModeChange?: (mode: FastMode) => void;

  // Channels
  channels: QuickSettingsChannel[];
  onChannelConfigure?: (channelId: string) => void;

  // Automations
  automation: QuickSettingsAutomation;
  onManageCron?: () => void;
  onBrowseSkills?: () => void;
  onConfigureMcp?: () => void;
  onConfigureAgy?: () => void;
  onAgySystemPromptModeChange?: (mode: "filtered" | "full" | "none") => void;
  onConfigureQaLab?: () => void;
  onQaLabEnabledChange?: (enabled: boolean) => void;

  // Security
  security: QuickSettingsSecurity;
  onSecurityConfigure?: () => void;
  onBrowserEnabledToggle?: (enabled: boolean) => void;
  onToolProfileChange?: (profile: string) => void;

  // Appearance
  theme: ThemeName;
  themeMode: ThemeMode;
  hasCustomTheme: boolean;
  customThemeLabel?: string | null;
  borderRadius: number;
  textScale: number;
  setTheme: (theme: ThemeName, context?: ThemeTransitionContext) => void;
  onOpenCustomThemeImport?: () => void;
  setThemeMode: (mode: ThemeMode, context?: ThemeTransitionContext) => void;
  setBorderRadius: (value: number) => void;
  setTextScale: (value: number) => void;
  userAvatar?: string | null;
  onUserAvatarChange?: (next: string | null) => void;

  // Presets
  configObject?: Record<string, unknown>;
  savedConfigObject?: Record<string, unknown>;
  configDirty?: boolean;
  configSaving?: boolean;
  configApplying?: boolean;
  configReady?: boolean;
  configSectionCount?: number;
  onSelectPreset?: (presetId: ConfigPresetId) => void;
  onResetConfig?: () => void;
  onSaveConfig?: () => void;
  onApplyConfig?: () => void;

  // Navigation
  onAdvancedSettings?: () => void;
  onRawSettings?: () => void;

  // Connection
  connected: boolean;
  gatewayUrl: string;
  assistantName: string;
  assistantAvatar?: string | null;
  assistantAvatarUrl?: string | null;
  assistantAvatarSource?: string | null;
  assistantAvatarStatus?: "none" | "local" | "remote" | "data" | null;
  assistantAvatarReason?: string | null;
  assistantAvatarOverride?: string | null;
  assistantAvatarUploadBusy?: boolean;
  assistantAvatarUploadError?: string | null;
  onAssistantAvatarOverrideChange?: (dataUrl: string) => void | Promise<void>;
  onAssistantAvatarClearOverride?: () => void | Promise<void>;
  basePath?: string | null;
  version: string;
};

// ── Theme options ──

type ThemeOption = { id: ThemeName; label: string };
const BUILTIN_THEME_OPTIONS: ThemeOption[] = [
  {
    id: "claw",
    get label() {
      return t("rawUi.config_quick_prop_6b276eb523a9");
    },
  },
  {
    id: "knot",
    get label() {
      return t("rawUi.config_quick_prop_69b7f867a05d");
    },
  },
  {
    id: "dash",
    get label() {
      return t("rawUi.config_quick_prop_f9c0d7e3fb50");
    },
  },
];

const BORDER_RADIUS_STOPS: Array<{ value: BorderRadiusStop; label: string }> = [
  {
    value: 0,
    get label() {
      return t("rawUi.config_quick_prop_b3faa25fa2da");
    },
  },
  {
    value: 25,
    get label() {
      return t("rawUi.config_quick_prop_ab379e2d1070");
    },
  },
  {
    value: 50,
    get label() {
      return t("rawUi.config_quick_prop_7e240053c717");
    },
  },
  {
    value: 75,
    get label() {
      return t("rawUi.config_quick_prop_9fce89aa034c");
    },
  },
  {
    value: 100,
    get label() {
      return t("rawUi.config_quick_prop_51666282855c");
    },
  },
];

const TEXT_SCALE_OPTIONS: Array<{ value: TextScaleStop; label: string }> = [
  {
    value: 90,
    get label() {
      return t("rawUi.config_quick_prop_122aed6a9524");
    },
  },
  {
    value: 100,
    get label() {
      return t("rawUi.config_quick_prop_e9d674cbeda5");
    },
  },
  {
    value: 110,
    get label() {
      return t("rawUi.config_quick_prop_94e7f4358e33");
    },
  },
  {
    value: 125,
    get label() {
      return t("rawUi.config_quick_prop_d94fcfdd3641");
    },
  },
  {
    value: 140,
    get label() {
      return t("rawUi.config_quick_prop_a61b9366999f");
    },
  },
];

const THINKING_LEVELS = ["off", "low", "medium", "high"];
const TOOL_PROFILES = ["minimal", "coding", "messaging", "full"];
const localUserLabel = () => t("rawUi.config_quick_userLabel");
// Keep raw uploads comfortably below the 2 MB persisted data URL limit after
// base64 expansion and a small MIME/header prefix are added.
const MAX_LOCAL_USER_AVATAR_FILE_BYTES = 1_500_000;
const MAX_ASSISTANT_AVATAR_UPLOAD_BYTES = MAX_LOCAL_USER_AVATAR_FILE_BYTES;

function renderDefaultUserAvatar() {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  `;
}

function renderLocalUserAvatarPreview(avatar: string | null | undefined) {
  const identity = normalizeLocalUserIdentity({ name: null, avatar });
  const avatarUrl = resolveLocalUserAvatarUrl(identity);
  const avatarText = resolveLocalUserAvatarText(identity);
  if (avatarUrl) {
    return html`<img class="qs-user-avatar" src=${avatarUrl} alt=${localUserLabel()} />`;
  }
  if (avatarText) {
    return html`<div class="qs-user-avatar qs-user-avatar--text" aria-label=${localUserLabel()}>
      ${avatarText}
    </div>`;
  }
  return html`
    <div class="qs-user-avatar qs-user-avatar--default" aria-label=${localUserLabel()}>
      ${renderDefaultUserAvatar()}
    </div>
  `;
}

function resolveAssistantPreviewAvatarUrl(props: QuickSettingsProps): string | null {
  const override = normalizeOptionalString(props.assistantAvatarOverride);
  if (override) {
    return resolveChatAvatarRenderUrl(override, {
      identity: {
        avatar: override,
        avatarUrl: override,
      },
    });
  }
  if (props.assistantAvatarStatus === "none" && props.assistantAvatarReason === "missing") {
    return null;
  }
  return resolveChatAvatarRenderUrl(props.assistantAvatarUrl, {
    identity: {
      avatar: props.assistantAvatar ?? undefined,
      avatarUrl: props.assistantAvatarUrl ?? undefined,
    },
  });
}

function formatAssistantAvatarSource(value: string | null | undefined): string | null {
  const source = normalizeOptionalString(value);
  if (!source) {
    return null;
  }
  if (/^data:image\//i.test(source)) {
    const header = source.slice(0, source.indexOf(",") > 0 ? source.indexOf(",") : 32);
    return `${header},...`;
  }
  return source.length > 72 ? `${source.slice(0, 34)}...${source.slice(-24)}` : source;
}

function formatAssistantAvatarIssue(
  status: QuickSettingsProps["assistantAvatarStatus"],
  reason: string | null | undefined,
  _rendered: boolean,
  hasOverride = false,
): string | null {
  if (hasOverride) {
    return null;
  }
  if (status === "remote") {
    return t("rawUi.config_quick_avatar_remoteBlocked");
  }
  if (reason === "missing") {
    return t("rawUi.config_quick_avatar_fileNotFound");
  }
  if (reason === "unsupported_extension") {
    return t("rawUi.config_quick_avatar_unsupportedType");
  }
  if (reason === "outside_workspace") {
    return t("rawUi.config_quick_avatar_outsideWorkspace");
  }
  if (reason === "too_large") {
    return t("rawUi.config_quick_avatar_tooLarge");
  }
  return reason ? t("rawUi.config_quick_avatar_cannotRender") : null;
}

function renderAssistantAvatarPreview(props: QuickSettingsProps) {
  const assistantName =
    normalizeOptionalString(props.assistantName) ?? t("rawUi.config_quick_assistant");
  const assistantAvatarOverride = normalizeOptionalString(props.assistantAvatarOverride);
  const assistantAvatarUrl = resolveAssistantPreviewAvatarUrl(props);
  if (assistantAvatarUrl) {
    return html`<img class="qs-assistant-avatar" src=${assistantAvatarUrl} alt=${assistantName} />`;
  }
  const assistantAvatarText = resolveAssistantTextAvatar(
    assistantAvatarOverride ?? props.assistantAvatar,
  );
  if (assistantAvatarText) {
    return html`<div
      class="qs-assistant-avatar qs-assistant-avatar--text"
      aria-label=${assistantName}
    >
      ${assistantAvatarText}
    </div>`;
  }
  return html`
    <img
      class="qs-assistant-avatar qs-assistant-avatar--fallback"
      src=${assistantAvatarFallbackUrl(props.basePath ?? "")}
      alt=${assistantName}
    />
  `;
}

function handleLocalUserAvatarFileSelect(e: Event, props: QuickSettingsProps) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  const onUserAvatarChange = props.onUserAvatarChange;
  if (!file || !onUserAvatarChange) {
    input.value = "";
    return;
  }
  if (!file.type.startsWith("image/")) {
    input.value = "";
    return;
  }
  if (file.size > MAX_LOCAL_USER_AVATAR_FILE_BYTES) {
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    onUserAvatarChange(typeof reader.result === "string" ? reader.result : null);
  });
  reader.readAsDataURL(file);
  input.value = "";
}

function handleAssistantAvatarFileSelect(e: Event, props: QuickSettingsProps) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  const onAssistantAvatarOverrideChange = props.onAssistantAvatarOverrideChange;
  if (!file || !onAssistantAvatarOverrideChange) {
    input.value = "";
    return;
  }
  if (file.size > MAX_ASSISTANT_AVATAR_UPLOAD_BYTES) {
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    if (result) {
      void onAssistantAvatarOverrideChange(result);
    }
  });
  reader.readAsDataURL(file);
  input.value = "";
}

type ProfileSettings = {
  bootstrapMaxChars: number;
  bootstrapTotalMaxChars: number;
  contextInjection: "always" | "continuation-skip";
};

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  bootstrapMaxChars: 20_000,
  bootstrapTotalMaxChars: 60_000,
  contextInjection: "always",
};

function resolveProfileSettings(config?: Record<string, unknown>): ProfileSettings {
  const agents = config?.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const bootstrapMaxChars =
    typeof defaults?.bootstrapMaxChars === "number" && Number.isFinite(defaults.bootstrapMaxChars)
      ? Math.floor(defaults.bootstrapMaxChars)
      : DEFAULT_PROFILE_SETTINGS.bootstrapMaxChars;
  const bootstrapTotalMaxChars =
    typeof defaults?.bootstrapTotalMaxChars === "number" &&
    Number.isFinite(defaults.bootstrapTotalMaxChars)
      ? Math.floor(defaults.bootstrapTotalMaxChars)
      : DEFAULT_PROFILE_SETTINGS.bootstrapTotalMaxChars;
  const contextInjection =
    defaults?.contextInjection === "continuation-skip" ? "continuation-skip" : "always";
  return { bootstrapMaxChars, bootstrapTotalMaxChars, contextInjection };
}

function profileSettingsEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return (
    a.bootstrapMaxChars === b.bootstrapMaxChars &&
    a.bootstrapTotalMaxChars === b.bootstrapTotalMaxChars &&
    a.contextInjection === b.contextInjection
  );
}

function formatCharBudget(value: number): string {
  return `${value.toLocaleString()} chars`;
}

function formatContextInjectionLabel(mode: ProfileSettings["contextInjection"]): string {
  return mode === "always"
    ? t("rawUi.config_quick_context_everyTurn")
    : t("rawUi.config_quick_context_skipSafeFollowUps");
}

function describeContextInjection(mode: ProfileSettings["contextInjection"]): string {
  return mode === "always"
    ? t("rawUi.config_quick_context_everyTurnDescription")
    : t("rawUi.config_quick_context_skipSafeFollowUpsDescription");
}

function renderProfileStat(params: {
  label: string;
  value: string;
  previousValue: string;
  note: string;
}) {
  const changed = params.value !== params.previousValue;
  return html`
    <div class="qs-profile-stat ${changed ? "qs-profile-stat--changed" : ""}">
      <div class="qs-profile-stat__header">
        <span class="qs-profile-stat__label">${params.label}</span>
        <span class="qs-profile-stat__value">${params.value}</span>
      </div>
      <div class="qs-profile-stat__sub">
        ${changed
          ? t("rawUi.config_quick_dynamic_wasValue", { value: params.previousValue })
          : t("rawUi.config_quick_dynamic_bb7a1dd5a269")}
      </div>
      <div class="qs-profile-stat__note muted">${params.note}</div>
    </div>
  `;
}

// ── Card renderers ──

function renderCardHeader(icon: TemplateResult, title: string, action?: TemplateResult) {
  return html`
    <div class="qs-card__header">
      <div class="qs-card__header-left">
        <span class="qs-card__icon">${icon}</span>
        <h3 class="qs-card__title">${title}</h3>
      </div>
      ${action ? action : nothing}
    </div>
  `;
}

function fastModeOptionValue(value: "auto" | "on" | "off"): FastMode {
  return value === "auto" ? "auto" : value === "on";
}

function renderModelCard(props: QuickSettingsProps) {
  const fastMode = formatFastModeValue(props.fastMode);
  return html`
    <div class="qs-card qs-card--model">
      ${renderCardHeader(icons.brain, t("rawUi.config_quick_card_modelThinking"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_69901bde6896")}</span>
          <button class="qs-row__value qs-row__value--action" @click=${props.onModelChange}>
            <code>${props.currentModel || "default"}</code>
            <span class="qs-row__chevron">${icons.chevronRight}</span>
          </button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_132022dfb63b")}</span>
          <div class="qs-segmented">
            ${THINKING_LEVELS.map(
              (level) => html`
                <button
                  class="qs-segmented__btn ${level === props.thinkingLevel
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.onThinkingChange?.(level)}
                >
                  ${level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_328e238bfe35")}</span>
          <div class="qs-segmented">
            ${(
              [
                ["auto", t("rawUi.config_quick_fastMode_auto")],
                ["on", t("rawUi.config_quick_fastMode_fast")],
                ["off", t("rawUi.config_quick_fastMode_standard")],
              ] as const
            ).map(
              ([value, label]) => html`
                <button
                  class="qs-segmented__btn ${fastMode === value ? "qs-segmented__btn--active" : ""}"
                  @click=${() =>
                    fastMode === value
                      ? undefined
                      : props.onFastModeChange?.(fastModeOptionValue(value))}
                >
                  ${label}
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderChannelsCard(props: QuickSettingsProps) {
  const connectedCount = props.channels.filter((c) => c.connected).length;
  const badge =
    connectedCount > 0
      ? html`<span class="qs-badge qs-badge--ok"
          >${connectedCount} ${t("rawUi.config_quick_fragment_6624d772b456")}</span
        >`
      : undefined;

  return html`
    <div class="qs-card qs-card--channels">
      ${renderCardHeader(icons.send, t("rawUi.config_quick_card_channels"), badge)}
      <div class="qs-card__body">
        ${props.channels.length === 0
          ? html`<div class="qs-empty muted">${t("rawUi.config_quick_text_93754f425ae9")}</div>`
          : props.channels.map(
              (ch) => html`
                <div class="qs-row">
                  <span class="qs-row__label">
                    <span class="qs-status-dot ${ch.connected ? "qs-status-dot--ok" : ""}"></span>
                    ${ch.label}
                  </span>
                  <span class="qs-row__value">
                    ${ch.connected
                      ? html`<span class="muted"
                          >${ch.detail ?? t("rawUi.config_quick_dynamic_0b636d662c60")}</span
                        >`
                      : html`<button
                          class="qs-link-btn"
                          @click=${() => props.onChannelConfigure?.(ch.id)}
                        >
                          ${t("rawUi.config_quick_text_c076a451cf65")}
                        </button>`}
                  </span>
                </div>
              `,
            )}
      </div>
    </div>
  `;
}

function renderAutomationsCard(props: QuickSettingsProps) {
  const { cronJobCount, directDeliveryJobCount, skillCount, mcpServerCount } = props.automation;

  return html`
    <div class="qs-card qs-card--automations">
      ${renderCardHeader(icons.zap, t("rawUi.config_quick_card_automations"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">
            ${cronJobCount}
            ${t("rawUi.config_quick_fragment_05d9eb88ab7c")}${cronJobCount !== 1 ? "s" : ""}
          </span>
          <button class="qs-link-btn" @click=${props.onManageCron}>
            ${t("rawUi.config_quick_text_8de628d757e2")}
          </button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">
            ${directDeliveryJobCount}
            ${t("rawUi.config_quick_fragment_7ce04413e849")}${directDeliveryJobCount !== 1
              ? "s"
              : ""}
          </span>
          <button class="qs-link-btn" @click=${props.onManageCron}>
            ${t("rawUi.config_quick_text_dafc1706ffbd")}
          </button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">
            ${skillCount}
            ${t("rawUi.config_quick_fragment_452fa1120835")}${skillCount !== 1 ? "s" : ""}
            ${t("rawUi.config_quick_fragment_0a925b77b464")}
          </span>
          <button class="qs-link-btn" @click=${props.onBrowseSkills}>
            ${t("rawUi.config_quick_text_0846800efe36")}
          </button>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">
            ${mcpServerCount}
            ${t("rawUi.config_quick_fragment_5d7137dcd0da")}${mcpServerCount !== 1 ? "s" : ""}
          </span>
          <button class="qs-link-btn" @click=${props.onConfigureMcp}>
            ${t("rawUi.config_quick_text_dafc1706ffbd")}
          </button>
        </div>
      </div>
    </div>
  `;
}

type PluginEntry = {
  enabled?: boolean;
  config?: Record<string, unknown>;
};

function pluginEntry(
  config: Record<string, unknown> | undefined,
  pluginId: string,
): PluginEntry | undefined {
  const plugins = config?.plugins;
  if (!plugins || typeof plugins !== "object" || Array.isArray(plugins)) {
    return undefined;
  }
  const entries = (plugins as Record<string, unknown>).entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return undefined;
  }
  const entry = (entries as Record<string, unknown>)[pluginId];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return undefined;
  }
  return entry as PluginEntry;
}

function renderPowerFeaturesCard(props: QuickSettingsProps) {
  const agy = pluginEntry(props.configObject, "agy");
  const qaLab = pluginEntry(props.configObject, "qa-lab");
  const agyMode =
    typeof agy?.config?.systemPromptMode === "string"
      ? agy.config.systemPromptMode
      : agy?.config?.includeSystemPrompt === true
        ? "full"
        : agy?.config?.includeSystemPrompt === false
          ? "none"
          : "filtered";
  const normalizedAgyMode =
    agyMode === "full" || agyMode === "none" || agyMode === "filtered" ? agyMode : "filtered";
  const agyEnabled = agy?.enabled !== false;
  const qaLabEnabled = qaLab?.enabled === true;
  const directCount = props.automation.directDeliveryJobCount;

  return html`
    <div class="qs-card qs-card--power">
      ${renderCardHeader(
        icons.spark,
        t("rawUi.config_quick_card_powerFeatures"),
        html`<span class="qs-badge qs-badge--accent"
          >${t("rawUi.config_quick_text_24f206374ac2")}</span
        >`,
      )}
      <div class="qs-card__body">
        <div class="qs-feature-row">
          <div class="qs-feature-row__icon">${icons.terminal}</div>
          <div class="qs-feature-row__copy">
            <strong>${t("rawUi.config_quick_text_eaf0170f31aa")}</strong>
            <span
              >${t("rawUi.config_quick_fragment_3ec1c4eaa0f9")} ${agyMode}
              ${t("rawUi.config_quick_fragment_fc08b1e1b16a")}</span
            >
          </div>
          <div class="qs-feature-row__actions">
            <select
              class="qs-feature-select"
              aria-label=${t("rawUi.config_quick_attr_1df92fc9fdf9")}
              .value=${normalizedAgyMode}
              @change=${(event: Event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                if (value === "filtered" || value === "full" || value === "none") {
                  props.onAgySystemPromptModeChange?.(value);
                }
              }}
            >
              <option value="filtered">${t("rawUi.config_quick_text_26ccffc851c0")}</option>
              <option value="full">${t("rawUi.config_quick_text_88a7c0d81dcc")}</option>
              <option value="none">${t("rawUi.config_quick_text_367aa8f1509f")}</option>
            </select>
            <span class="qs-badge ${agyEnabled ? "qs-badge--ok" : "qs-badge--warn"}">
              ${agyEnabled
                ? t("rawUi.config_quick_available")
                : t("rawUi.config_quick_dynamic_a8c294854644")}
            </span>
            <button class="qs-link-btn" @click=${props.onConfigureAgy}>
              ${t("rawUi.config_quick_text_fa7d9a1446c5")}
            </button>
          </div>
        </div>
        <div class="qs-feature-row">
          <div class="qs-feature-row__icon">${icons.send}</div>
          <div class="qs-feature-row__copy">
            <strong>${t("rawUi.config_quick_text_bef0cfa7c245")}</strong>
            <span>${t("rawUi.config_quick_text_2ef55b756b06")}</span>
          </div>
          <div class="qs-feature-row__actions">
            <span class="qs-badge ${directCount > 0 ? "qs-badge--ok" : ""}">
              ${directCount} ${t("rawUi.config_quick_fragment_0b805ed866c4")}
            </span>
            <button class="qs-link-btn" @click=${props.onManageCron}>
              ${t("rawUi.config_quick_text_8de628d757e2")}
            </button>
          </div>
        </div>
        <div class="qs-feature-row">
          <div class="qs-feature-row__icon">${icons.bug}</div>
          <div class="qs-feature-row__copy">
            <strong>${t("rawUi.config_quick_text_77422a7f1888")}</strong>
            <span>${t("rawUi.config_quick_text_eee1e5bb63e0")}</span>
          </div>
          <div class="qs-feature-row__actions">
            <label class="qs-toggle qs-toggle--compact">
              <input
                type="checkbox"
                .checked=${qaLabEnabled}
                aria-label=${t("rawUi.config_quick_attr_3674ba843e7d")}
                @change=${(event: Event) =>
                  props.onQaLabEnabledChange?.((event.currentTarget as HTMLInputElement).checked)}
              />
              <span class="qs-toggle__track"></span>
            </label>
            <span class="qs-badge ${qaLabEnabled ? "qs-badge--ok" : ""}">
              ${qaLabEnabled
                ? t("rawUi.config_quick_dynamic_de8a93bad0f9")
                : t("rawUi.config_quick_optional")}
            </span>
            <button class="qs-link-btn" @click=${props.onConfigureQaLab}>
              ${t("rawUi.config_quick_text_fa7d9a1446c5")}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderConfigurationCoverageCard(props: QuickSettingsProps) {
  const sectionCount = props.configSectionCount ?? 0;
  return html`
    <div class="qs-card qs-card--coverage">
      ${renderCardHeader(
        icons.fileCode,
        t("rawUi.config_quick_card_completeConfiguration"),
        props.configDirty
          ? html`<span class="qs-badge qs-badge--warn"
              >${t("rawUi.config_quick_text_290761725737")}</span
            >`
          : html`<span class="qs-badge qs-badge--ok"
              >${t("rawUi.config_quick_text_c66dbbca4925")}</span
            >`,
      )}
      <div class="qs-coverage">
        <div class="qs-coverage__metric">
          <strong>${sectionCount || t("rawUi.config_quick_all")}</strong>
          <span>${t("rawUi.config_quick_schemaSections")}</span>
        </div>
        <p>${t("rawUi.config_quick_text_a3918619eec0")}</p>
        <div class="qs-coverage__layers" aria-label=${t("rawUi.config_quick_attr_3377d4d35b36")}>
          <span>${icons.check} ${t("rawUi.config_quick_fragment_d7d7367261ab")}</span>
          <span>${icons.check} ${t("rawUi.config_quick_fragment_5d517c426a78")}</span>
          <span>${icons.check} Raw JSON</span>
        </div>
        <div class="qs-coverage__actions">
          <button class="btn btn--primary btn--sm" @click=${props.onAdvancedSettings}>
            ${t("rawUi.config_quick_text_b4603711ec4d")}
          </button>
          <button class="btn btn--sm" @click=${props.onRawSettings}>
            ${icons.fileCode} ${t("rawUi.config_quick_fragment_22b90d12cf3b")}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSecurityCard(props: QuickSettingsProps) {
  const { gatewayAuth, execPolicy, deviceAuth, browserEnabled, toolProfile } = props.security;
  const normalizedToolProfile = toolProfile.trim() || "full";
  const toolProfiles = TOOL_PROFILES.includes(normalizedToolProfile)
    ? TOOL_PROFILES
    : [...TOOL_PROFILES, normalizedToolProfile];

  return html`
    <div class="qs-card qs-card--security">
      ${renderCardHeader(
        icons.eye,
        t("rawUi.config_quick_card_security"),
        html`<button class="qs-link-btn" @click=${props.onSecurityConfigure}>
          ${t("rawUi.config_quick_text_dafc1706ffbd")}
        </button>`,
      )}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_37646a1ec487")}</span>
          <span class="qs-row__value">
            <span class="qs-badge ${gatewayAuth !== "none" ? "qs-badge--ok" : "qs-badge--warn"}"
              >${gatewayAuth}</span
            >
          </span>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_b2a022b0cd57")}</span>
          <span class="qs-row__value"><span class="qs-badge">${execPolicy}</span></span>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("quickSettings.security.browserEnabled")}</span>
          <label class="qs-toggle">
            <input
              type="checkbox"
              .checked=${browserEnabled}
              @change=${(event: Event) =>
                props.onBrowserEnabledToggle?.((event.currentTarget as HTMLInputElement).checked)}
            />
            <span class="qs-toggle__track"></span>
            <span class="qs-toggle__hint muted"
              >${browserEnabled
                ? t("rawUi.config_quick_dynamic_de8a93bad0f9")
                : t("rawUi.config_quick_dynamic_a8c294854644")}</span
            >
          </label>
        </div>
        <div class="qs-row qs-row--tool-profile">
          <span class="qs-row__label">${t("quickSettings.security.toolProfile")}</span>
          <div class="qs-segmented">
            ${toolProfiles.map(
              (profile) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${profile ===
                  normalizedToolProfile
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.onToolProfileChange?.(profile)}
                >
                  ${profile}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_516828a67e26")}</span>
          <span class="qs-row__value">
            <span class="qs-badge ${deviceAuth ? "qs-badge--ok" : "qs-badge--warn"}"
              >${deviceAuth
                ? t("rawUi.config_quick_dynamic_de8a93bad0f9")
                : t("rawUi.config_quick_dynamic_a8c294854644")}</span
            >
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderAppearanceCard(props: QuickSettingsProps) {
  const importedThemeName = props.hasCustomTheme
    ? (props.customThemeLabel ?? t("rawUi.config_quick_importedTheme"))
    : t("rawUi.config_quick_import");
  const themeOptions: ThemeOption[] = [
    ...BUILTIN_THEME_OPTIONS,
    { id: "custom", label: importedThemeName },
  ];
  return html`
    <div class="qs-card qs-card--appearance">
      ${renderCardHeader(icons.spark, t("rawUi.config_quick_card_appearance"))}
      <div class="qs-card__body">
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_695509dea6d5")}</span>
          <div class="qs-segmented">
            ${themeOptions.map(
              (opt) => html`
                <button
                  class="qs-segmented__btn ${opt.id === props.theme
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${(e: Event) => {
                    if (opt.id === "custom" && !props.hasCustomTheme) {
                      props.onOpenCustomThemeImport?.();
                      return;
                    }
                    if (opt.id !== props.theme) {
                      props.setTheme(opt.id, {
                        element: (e.currentTarget as HTMLElement) ?? undefined,
                      });
                    }
                  }}
                >
                  ${opt.label}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_04e57dc7a5f2")}</span>
          <div class="qs-segmented">
            ${(["light", "dark", "system"] as ThemeMode[]).map(
              (mode) => html`
                <button
                  class="qs-segmented__btn ${mode === props.themeMode
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${(e: Event) => {
                    if (mode !== props.themeMode) {
                      props.setThemeMode(mode, {
                        element: (e.currentTarget as HTMLElement) ?? undefined,
                      });
                    }
                  }}
                >
                  ${mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_c80e095a3bae")}</span>
          <div class="qs-segmented">
            ${BORDER_RADIUS_STOPS.map(
              (stop) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${stop.value ===
                  props.borderRadius
                    ? "qs-segmented__btn--active"
                    : ""}"
                  @click=${() => props.setBorderRadius(stop.value)}
                >
                  ${stop.label}
                </button>
              `,
            )}
          </div>
        </div>
        <div class="qs-row">
          <span class="qs-row__label">${t("rawUi.config_quick_text_2c696afa7ca1")}</span>
          <div class="qs-segmented">
            ${TEXT_SCALE_OPTIONS.map(
              (stop) => html`
                <button
                  class="qs-segmented__btn qs-segmented__btn--compact ${stop.value ===
                  props.textScale
                    ? "qs-segmented__btn--active"
                    : ""}"
                  title=${`${stop.value}%`}
                  @click=${() => props.setTextScale(stop.value)}
                >
                  ${stop.label}
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPersonalCard(props: QuickSettingsProps) {
  const identity = normalizeLocalUserIdentity({
    name: null,
    avatar: props.userAvatar ?? null,
  });
  const avatarText = resolveLocalUserAvatarText(identity) ?? "";
  const assistantName =
    normalizeOptionalString(props.assistantName) ?? t("rawUi.config_quick_assistant");
  const assistantAvatarUrl = resolveAssistantPreviewAvatarUrl(props);
  const assistantAvatarRendered = Boolean(
    assistantAvatarUrl ||
    resolveAssistantTextAvatar(props.assistantAvatarOverride ?? props.assistantAvatar),
  );
  const assistantAvatarOverride = normalizeOptionalString(props.assistantAvatarOverride);
  const assistantAvatarSource = formatAssistantAvatarSource(
    assistantAvatarOverride ?? props.assistantAvatarSource,
  );
  const assistantAvatarIssue = formatAssistantAvatarIssue(
    props.assistantAvatarStatus ?? null,
    props.assistantAvatarReason,
    assistantAvatarRendered,
    Boolean(assistantAvatarOverride),
  );
  const assistantAvatarSourceLabel = assistantAvatarOverride
    ? t("rawUi.config_quick_avatar_uiOverride")
    : "IDENTITY.md";
  const canOverrideAssistantAvatar = Boolean(props.onAssistantAvatarOverrideChange);
  const assistantAvatarSubtitle = assistantAvatarOverride
    ? t("rawUi.config_quick_avatar_overrideFromSettings")
    : assistantAvatarIssue
      ? t("rawUi.config_quick_avatar_fallbackAvatar")
      : assistantAvatarRendered
        ? t("rawUi.config_quick_avatar_fromIdentity")
        : t("rawUi.config_quick_avatar_fallbackLogo");
  return html`
    <div class="qs-card qs-card--personal">
      ${renderCardHeader(icons.image, t("rawUi.config_quick_card_personal"))}
      <div class="qs-card__body">
        <div class="qs-identity-grid">
          <section class="qs-identity-card" aria-label=${t("rawUi.config_quick_attr_5ec87147f684")}>
            ${renderLocalUserAvatarPreview(props.userAvatar)}
            <div class="qs-identity-card__copy">
              <div class="qs-identity-card__eyebrow">
                ${t("rawUi.config_quick_text_a22494d44acf")}
              </div>
              <div class="qs-identity-card__title">${localUserLabel()}</div>
              <div class="qs-identity-card__sub">${t("rawUi.config_quick_text_0463fd853a76")}</div>
              <div class="qs-identity-card__repair">
                <label class="qs-field">
                  <span class="qs-row__label">${t("rawUi.config_quick_text_d767e7ab036a")}</span>
                  <input
                    class="qs-field__input"
                    type="text"
                    maxlength="16"
                    .value=${avatarText}
                    placeholder=${t("rawUi.config_quick_attr_3ec4eeba7577")}
                    @input=${(e: Event) => {
                      const value = (e.target as HTMLInputElement).value;
                      props.onUserAvatarChange?.(value.trim() ? value : null);
                    }}
                  />
                </label>
                <div class="qs-identity-card__actions">
                  <label class="btn btn--sm">
                    ${t("rawUi.config_quick_text_571c7528c350")}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      @change=${(e: Event) => handleLocalUserAvatarFileSelect(e, props)}
                    />
                  </label>
                  <button
                    type="button"
                    class="btn btn--sm btn--ghost"
                    ?disabled=${!identity.avatar}
                    @click=${() => {
                      props.onUserAvatarChange?.(null);
                    }}
                  >
                    ${t("rawUi.config_quick_text_5049f35660b3")}
                  </button>
                </div>
                <div class="muted">${t("rawUi.config_quick_text_6e7f5952d4b1")}</div>
              </div>
            </div>
          </section>
          <section
            class="qs-identity-card qs-identity-card--assistant"
            aria-label=${t("rawUi.config_quick_attr_29ea12980431")}
          >
            ${renderAssistantAvatarPreview(props)}
            <div class="qs-identity-card__copy">
              <div class="qs-identity-card__eyebrow">
                ${t("rawUi.config_quick_text_7e50a4f30a53")}
              </div>
              <div class="qs-identity-card__title">${assistantName}</div>
              <div class="qs-identity-card__sub">${assistantAvatarSubtitle}</div>
              ${assistantAvatarSource
                ? html`
                    <div
                      class="qs-identity-card__source"
                      title=${props.assistantAvatarSource ?? ""}
                    >
                      <span>${assistantAvatarSourceLabel}</span>
                      <code>${assistantAvatarSource}</code>
                    </div>
                  `
                : nothing}
              ${assistantAvatarIssue
                ? html`<div class="qs-identity-card__issue">${assistantAvatarIssue}</div>`
                : nothing}
              ${canOverrideAssistantAvatar
                ? html`
                    <div class="qs-identity-card__repair">
                      <div class="qs-identity-card__actions">
                        <label class="btn btn--sm">
                          ${props.assistantAvatarUploadBusy
                            ? t("rawUi.config_quick_dynamic_e486ea385a13")
                            : assistantAvatarOverride
                              ? t("rawUi.config_quick_dynamic_ddc99c38bede")
                              : t("rawUi.config_quick_dynamic_a8de669edf12")}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            ?disabled=${props.assistantAvatarUploadBusy === true}
                            @change=${(e: Event) => handleAssistantAvatarFileSelect(e, props)}
                          />
                        </label>
                        ${assistantAvatarOverride
                          ? html`
                              <button
                                type="button"
                                class="btn btn--sm btn--ghost"
                                ?disabled=${props.assistantAvatarUploadBusy === true}
                                @click=${() => {
                                  void props.onAssistantAvatarClearOverride?.();
                                }}
                              >
                                ${t("rawUi.config_quick_text_ab881f5a927a")}
                              </button>
                            `
                          : nothing}
                      </div>
                      <div class="muted">${t("rawUi.config_quick_text_00e853e81b89")}</div>
                    </div>
                  `
                : nothing}
              ${props.assistantAvatarUploadError
                ? html`<div class="qs-identity-card__error">
                    ${props.assistantAvatarUploadError}
                  </div>`
                : nothing}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderPresetsCard(props: QuickSettingsProps) {
  const draftConfig = props.configObject ?? props.savedConfigObject ?? {};
  const savedConfig = props.savedConfigObject ?? {};
  const selectedPresetId = detectActivePreset(draftConfig);
  const savedPresetId = detectActivePreset(savedConfig);
  const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : undefined;
  const savedPreset = savedPresetId ? getPresetById(savedPresetId) : undefined;
  const draftSettings = resolveProfileSettings(draftConfig);
  const savedSettings = resolveProfileSettings(savedConfig);
  const hasPendingProfileChange = !profileSettingsEqual(draftSettings, savedSettings);
  const hasPendingConfigChange = props.configDirty === true;
  const canCommit =
    props.connected &&
    props.configReady === true &&
    props.configSaving !== true &&
    props.configApplying !== true;
  const stateBanner = hasPendingProfileChange
    ? html`
        <div class="qs-profile-state qs-profile-state--pending" aria-live="polite">
          <span class="qs-status-dot"></span>
          <div class="qs-profile-state__text">
            <span class="qs-profile-state__title"
              >${selectedPreset?.label ?? t("rawUi.config_quick_dynamic_ce2f41cdcc94")}
              ${t("rawUi.config_quick_fragment_356fa73bee88")}</span
            >
            <span class="qs-profile-state__copy">${t("rawUi.config_quick_text_0db2ff9b4771")}</span>
          </div>
        </div>
      `
    : savedPreset
      ? html`
          <div class="qs-profile-state qs-profile-state--ok" aria-live="polite">
            <span class="qs-status-dot qs-status-dot--ok"></span>
            <div class="qs-profile-state__text">
              <span class="qs-profile-state__title"
                >${savedPreset.label} ${t("rawUi.config_quick_fragment_b2ed4ec8d21b")}</span
              >
              <span class="qs-profile-state__copy"
                >${t("rawUi.config_quick_text_48688fc526ca")}</span
              >
            </div>
          </div>
        `
      : html`
          <div class="qs-profile-state" aria-live="polite">
            <span class="qs-status-dot"></span>
            <div class="qs-profile-state__text">
              <span class="qs-profile-state__title"
                >${t("rawUi.config_quick_text_2149bdba7907")}</span
              >
              <span class="qs-profile-state__copy"
                >${t("rawUi.config_quick_text_5943fc7b8386")}</span
              >
            </div>
          </div>
        `;
  const panelTitle = selectedPreset?.label ?? t("rawUi.config_quick_customConfiguration");
  const panelDescription =
    selectedPreset?.detail ?? t("rawUi.config_quick_customConfigurationDescription");
  const panelImpact = selectedPreset?.impact ?? t("rawUi.config_quick_customConfigurationImpact");
  const commitCopy = hasPendingProfileChange
    ? t("rawUi.config_quick_commitProfileCopy")
    : t("rawUi.config_quick_commitAllCopy");

  return html`
    <div class="qs-card qs-card--span-all">
      ${renderCardHeader(
        icons.zap,
        t("rawUi.config_quick_card_contextProfile"),
        hasPendingProfileChange
          ? html`<span class="qs-badge qs-badge--warn"
              >${t("rawUi.config_quick_text_feda0ef66860")}</span
            >`
          : savedPreset
            ? html`<span class="qs-badge qs-badge--ok"
                >${t("rawUi.config_quick_text_3c0af9de4dd1")}</span
              >`
            : html`<span class="qs-badge">${t("rawUi.config_quick_text_b1660112569b")}</span>`,
      )}
      <div class="qs-card__body qs-profiles">
        <div class="qs-profiles__copy">
          <div class="qs-profiles__eyebrow">${t("rawUi.config_quick_text_83f592fd146c")}</div>
          <p class="qs-profiles__intro">${t("rawUi.config_quick_text_b1306631ca95")}</p>
          ${stateBanner}
          <div class="qs-presets-grid">
            ${CONFIG_PRESETS.map((preset) => {
              const presetDefaults = ((preset.patch.agents as Record<string, unknown> | undefined)
                ?.defaults ?? {}) as Record<string, unknown>;
              const presetContext =
                presetDefaults.contextInjection === "continuation-skip"
                  ? "continuation-skip"
                  : "always";
              return html`
                <button
                  type="button"
                  class="qs-preset ${preset.id === selectedPresetId ? "qs-preset--active" : ""}"
                  aria-pressed=${preset.id === selectedPresetId}
                  @click=${() => props.onSelectPreset?.(preset.id)}
                >
                  <div class="qs-preset__head">
                    <div class="qs-preset__identity">
                      <span class="qs-preset__icon">${preset.icon}</span>
                      <div class="qs-preset__identity-copy">
                        <span class="qs-preset__label">${preset.label}</span>
                        <span class="qs-preset__desc muted">${preset.description}</span>
                      </div>
                    </div>
                    <div class="qs-preset__badges">
                      ${preset.id === savedPresetId
                        ? html`<span class="qs-badge qs-badge--ok"
                            >${t("rawUi.config_quick_text_7810566609c0")}</span
                          >`
                        : nothing}
                      ${hasPendingProfileChange && preset.id === selectedPresetId
                        ? html`<span class="qs-badge qs-badge--warn"
                            >${t("rawUi.config_quick_text_a1f41d3ba3b6")}</span
                          >`
                        : nothing}
                    </div>
                  </div>
                  <div class="qs-preset__meta">
                    <span
                      >${formatCharBudget(Number(presetDefaults.bootstrapMaxChars ?? 0))}
                      ${t("rawUi.config_quick_fragment_6e969b0f8b92")}</span
                    >
                    <span
                      >${formatCharBudget(Number(presetDefaults.bootstrapTotalMaxChars ?? 0))}
                      ${t("rawUi.config_quick_fragment_d5cc6fd33178")}</span
                    >
                    <span>${formatContextInjectionLabel(presetContext)}</span>
                  </div>
                </button>
              `;
            })}
          </div>
        </div>

        <div class="qs-profile-panel">
          <div class="qs-profile-panel__eyebrow">
            ${selectedPreset
              ? t("rawUi.config_quick_dynamic_509d13b8233a")
              : t("rawUi.config_quick_dynamic_f1918f485455")}
          </div>
          <h4 class="qs-profile-panel__title">${panelTitle}</h4>
          <p class="qs-profile-panel__copy">${panelDescription}</p>
          <div class="qs-profile-panel__impact">${panelImpact}</div>

          <div class="qs-profile-panel__stats">
            ${renderProfileStat({
              label: t("rawUi.config_quick_prop_6906916e5fe0"),
              value: formatCharBudget(draftSettings.bootstrapMaxChars),
              previousValue: formatCharBudget(savedSettings.bootstrapMaxChars),
              note: t("rawUi.config_quick_context_maxPerFile"),
            })}
            ${renderProfileStat({
              label: t("rawUi.config_quick_prop_d9433c9a4580"),
              value: formatCharBudget(draftSettings.bootstrapTotalMaxChars),
              previousValue: formatCharBudget(savedSettings.bootstrapTotalMaxChars),
              note: t("rawUi.config_quick_context_maxTotal"),
            })}
            ${renderProfileStat({
              label: t("rawUi.config_quick_prop_d69a7255e6d2"),
              value: formatContextInjectionLabel(draftSettings.contextInjection),
              previousValue: formatContextInjectionLabel(savedSettings.contextInjection),
              note: describeContextInjection(draftSettings.contextInjection),
            })}
          </div>

          ${hasPendingConfigChange
            ? html`
                <div class="qs-profile-panel__actions">
                  <div class="qs-profile-panel__actions-copy muted">${commitCopy}</div>
                  <div class="qs-profile-panel__actions-row">
                    <button
                      class="btn btn--sm"
                      ?disabled=${props.configSaving === true || props.configApplying === true}
                      @click=${props.onResetConfig}
                    >
                      ${t("rawUi.config_quick_text_07e5976869bf")}
                    </button>
                    <button
                      class="btn btn--sm primary"
                      ?disabled=${!canCommit}
                      @click=${props.onSaveConfig}
                    >
                      ${props.configSaving === true
                        ? t("rawUi.config_quick_saving")
                        : hasPendingProfileChange
                          ? t("rawUi.config_quick_dynamic_2c7cb063fcc3")
                          : t("rawUi.config_quick_dynamic_3273523a0fb8")}
                    </button>
                    <button
                      class="btn btn--sm"
                      ?disabled=${!canCommit}
                      @click=${props.onApplyConfig}
                    >
                      ${props.configApplying === true
                        ? t("rawUi.config_quick_applying")
                        : t("rawUi.config_quick_dynamic_a22d618d9be3")}
                    </button>
                  </div>
                </div>
              `
            : html`
                <div class="qs-profile-panel__footer muted" aria-live="polite">
                  ${savedPreset
                    ? t("rawUi.config_quick_dynamic_e889614a96a9")
                    : t("rawUi.config_quick_dynamic_e277a4fd196a")}
                </div>
              `}
        </div>
      </div>
    </div>
  `;
}

function renderConnectionFooter(props: QuickSettingsProps) {
  return html`
    <div class="qs-footer">
      <div class="qs-footer__row">
        <span class="qs-status-dot ${props.connected ? "qs-status-dot--ok" : ""}"></span>
        <span class="muted"
          >${props.connected
            ? t("rawUi.config_quick_dynamic_0b636d662c60")
            : t("rawUi.config_quick_dynamic_4a6fc8988c33")}</span
        >
        ${props.assistantName ? html`<span class="muted">· ${props.assistantName}</span>` : nothing}
        ${props.version ? html`<span class="muted">· v${props.version}</span>` : nothing}
      </div>
    </div>
  `;
}

// ── Main render ──

export function renderQuickSettings(props: QuickSettingsProps) {
  return html`
    <div class="qs-container">
      <div class="qs-header">
        <div class="qs-header__copy">
          <span class="qs-header__eyebrow">${t("rawUi.config_quick_text_0d895109e078")}</span>
          <h2 class="qs-header__title">${t("rawUi.config_quick_text_7fb2bbfadf99")}</h2>
          <p class="qs-header__subtitle">${t("rawUi.config_quick_text_3b1bc1aa23ff")}</p>
        </div>
        <div class="qs-header__actions">
          <button class="btn btn--sm" @click=${props.onRawSettings}>
            ${icons.fileCode} Raw JSON
          </button>
          <button class="btn btn--primary btn--sm" @click=${props.onAdvancedSettings}>
            ${t("rawUi.config_quick_fragment_7750b475beef")} ${icons.chevronRight}
          </button>
        </div>
      </div>

      <div class="qs-grid">
        ${renderModelCard(props)} ${renderChannelsCard(props)} ${renderSecurityCard(props)}
        ${renderPersonalCard(props)}
        <div class="qs-side-stack">
          ${renderAppearanceCard(props)} ${renderAutomationsCard(props)}
        </div>
        ${renderPowerFeaturesCard(props)} ${renderConfigurationCoverageCard(props)}
        ${renderPresetsCard(props)}
      </div>

      ${renderConnectionFooter(props)}
    </div>
  `;
}
