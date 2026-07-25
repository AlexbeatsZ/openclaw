// Control UI view renders agents panels tools skills screen content.
import { html, nothing } from "lit";
import { normalizeToolName } from "../../../../src/agents/tool-policy-shared.js";
import { t } from "../../i18n/index.ts";
import { normalizeLowercaseStringOrEmpty, normalizeStringEntries } from "../string-coerce.ts";
import type {
  SkillStatusEntry,
  SkillStatusReport,
  ToolsCatalogResult,
  ToolsEffectiveEntry,
  ToolsEffectiveResult,
} from "../types.ts";
import {
  type AgentToolEntry,
  type AgentToolSection,
  isAllowedByPolicy,
  matchesList,
  resolveAgentConfig,
  resolveToolProfileOptions,
  resolveToolProfile,
  resolveToolSections,
} from "./agents-utils.ts";
import type { SkillGroup } from "./skills-grouping.ts";
import { groupSkills } from "./skills-grouping.ts";
import {
  computeSkillMissing,
  computeSkillReasons,
  renderSkillStatusChips,
} from "./skills-shared.ts";

function renderToolMetaBadges(labels: string[]) {
  if (labels.length === 0) {
    return nothing;
  }
  return html`
    <div class="agent-tool-badges">
      ${labels.map((label) => html`<span class="agent-pill">${label}</span>`)}
    </div>
  `;
}

function buildCatalogBadgeLabels(section: AgentToolSection, tool: AgentToolEntry): string[] {
  const source = tool.source ?? section.source;
  const pluginId = tool.pluginId ?? section.pluginId;
  const badges: string[] = [];
  if (source === "plugin" && pluginId) {
    badges.push(`Plugin: ${pluginId}`);
  } else if (source === "core") {
    badges.push(t("rawUi.agents_tools_badge_builtIn"));
  }
  if (tool.optional) {
    badges.push(t("rawUi.agents_tools_badge_optional"));
  }
  return badges;
}

function buildRowStatusBadges(params: {
  section: AgentToolSection;
  tool: AgentToolEntry;
  activeEntry: ToolsEffectiveEntry | null;
}) {
  const badges = buildCatalogBadgeLabels(params.section, params.tool);
  if (params.activeEntry) {
    badges.unshift(t("rawUi.agents_tools_badge_liveNow"));
  }
  return badges;
}

function formatToolPolicyState(params: {
  allowed: boolean;
  baseAllowed: boolean;
  denied: boolean;
}) {
  if (params.denied) {
    return t("rawUi.agents_tools_reason_disabledOverride");
  }
  if (params.allowed && params.baseAllowed) {
    return t("rawUi.agents_tools_reason_enabledProfile");
  }
  if (params.allowed) {
    return t("rawUi.agents_tools_reason_enabledOverride");
  }
  return t("rawUi.agents_tools_reason_notInProfile");
}

function formatToolSourceLabel(section: AgentToolSection, tool: AgentToolEntry) {
  const source = tool.source ?? section.source;
  const pluginId = tool.pluginId ?? section.pluginId;
  if (source === "plugin" && pluginId) {
    return `Plugin: ${pluginId}`;
  }
  return t("rawUi.agents_tools_access_builtIn");
}

function formatToolAccessSummary(params: {
  allowed: boolean;
  baseAllowed: boolean;
  denied: boolean;
}) {
  if (params.denied) {
    return t("rawUi.agents_tools_access_overrideOff");
  }
  if (params.allowed && params.baseAllowed) {
    return t("rawUi.agents_tools_access_enabled");
  }
  if (params.allowed) {
    return t("rawUi.agents_tools_access_overrideOn");
  }
  return t("rawUi.agents_tools_access_profileOff");
}

function formatToolRuntimeSummary(params: {
  activeEntry: ToolsEffectiveEntry | null;
  runtimeSessionMatchesSelectedAgent: boolean;
}) {
  if (params.activeEntry) {
    return t("rawUi.agents_tools_runtime_liveNow");
  }
  if (params.runtimeSessionMatchesSelectedAgent) {
    return t("rawUi.agents_tools_runtime_notLive");
  }
  return t("rawUi.agents_tools_runtime_otherAgent");
}

function toToolAnchorId(toolId: string) {
  const safe = normalizeToolName(toolId).replace(/[^a-z0-9_-]+/g, "-");
  return `agent-tool-${safe}`;
}

function flattenEffectiveTools(groups: ToolsEffectiveResult["groups"] | null | undefined) {
  return (groups ?? []).flatMap((group) => group.tools);
}

const MAX_RUNTIME_TOOL_CHIPS = 12;

function handleToolGroupToggle(event: Event) {
  const group = event.currentTarget;
  if (!(group instanceof HTMLDetailsElement) || group.open) {
    return;
  }
  for (const tool of group.querySelectorAll<HTMLDetailsElement>(".agent-tool-card[open]")) {
    tool.open = false;
  }
}

function handleRuntimeToolJump(event: Event, anchorId: string) {
  const target = document.getElementById(anchorId);
  if (!(target instanceof HTMLDetailsElement)) {
    return;
  }

  event.preventDefault();
  const parentGroup = target.closest<HTMLDetailsElement>(".agent-tools-group");
  if (parentGroup) {
    parentGroup.open = true;
  }
  target.open = true;

  const nextUrl = new URL(window.location.href);
  nextUrl.hash = anchorId;
  window.history.replaceState(null, "", nextUrl);

  requestAnimationFrame(() => {
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView?.({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
    target.querySelector<HTMLElement>("summary")?.focus();
  });
}

function renderEffectiveToolNotices(result: ToolsEffectiveResult | null) {
  const notices = result?.notices ?? [];
  if (notices.length === 0) {
    return nothing;
  }
  return html`
    <div class="agent-tools-notices">
      ${notices.map(
        (notice) => html`
          <div
            class="callout ${notice.severity === "warning" ? "warning" : "info"}"
            style="margin-top: 12px"
          >
            ${notice.message}
          </div>
        `,
      )}
    </div>
  `;
}

function renderEffectiveToolBadge(tool: {
  source: "core" | "plugin" | "channel" | "mcp";
  pluginId?: string;
  channelId?: string;
}) {
  if (tool.source === "plugin") {
    return tool.pluginId
      ? t("agentTools.connectedSource", { id: tool.pluginId })
      : t("agentTools.connected");
  }
  if (tool.source === "channel") {
    return tool.channelId
      ? t("agentTools.channelSource", { id: tool.channelId })
      : t("agentTools.channel");
  }
  if (tool.source === "mcp") {
    return "MCP";
  }
  return t("agentTools.builtIn");
}

export function renderAgentTools(params: {
  agentId: string;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  toolsCatalogLoading: boolean;
  toolsCatalogError: string | null;
  toolsCatalogResult: ToolsCatalogResult | null;
  toolsEffectiveLoading: boolean;
  toolsEffectiveError: string | null;
  toolsEffectiveResult: ToolsEffectiveResult | null;
  runtimeSessionKey: string;
  runtimeSessionMatchesSelectedAgent: boolean;
  onProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const agentTools = config.entry?.tools ?? {};
  const globalTools = config.globalTools ?? {};
  const profile = agentTools.profile ?? globalTools.profile ?? "full";
  const profileOptions = resolveToolProfileOptions(params.toolsCatalogResult);
  const toolSections = resolveToolSections(params.toolsCatalogResult);
  const profileSource = agentTools.profile
    ? "agent override"
    : globalTools.profile
      ? "global default"
      : "default";
  const hasAgentAllow = Array.isArray(agentTools.allow) && agentTools.allow.length > 0;
  const hasGlobalAllow = Array.isArray(globalTools.allow) && globalTools.allow.length > 0;
  const editable =
    Boolean(params.configForm) &&
    !params.configLoading &&
    !params.configSaving &&
    !hasAgentAllow &&
    !(params.toolsCatalogLoading && !params.toolsCatalogResult && !params.toolsCatalogError);
  const alsoAllow = hasAgentAllow
    ? []
    : Array.isArray(agentTools.alsoAllow)
      ? agentTools.alsoAllow
      : [];
  const deny = hasAgentAllow ? [] : Array.isArray(agentTools.deny) ? agentTools.deny : [];
  const basePolicy = hasAgentAllow
    ? { allow: agentTools.allow ?? [], deny: agentTools.deny ?? [] }
    : (resolveToolProfile(profile) ?? undefined);
  const toolIds = toolSections.flatMap((section) => section.tools.map((tool) => tool.id));

  const resolveAllowed = (toolId: string) => {
    const baseAllowed = isAllowedByPolicy(toolId, basePolicy);
    const extraAllowed = matchesList(toolId, alsoAllow);
    const denied = matchesList(toolId, deny);
    const allowed = (baseAllowed || extraAllowed) && !denied;
    return {
      allowed,
      baseAllowed,
      denied,
    };
  };
  const enabledCount = toolIds.filter((toolId) => resolveAllowed(toolId).allowed).length;
  const effectiveTools =
    params.runtimeSessionMatchesSelectedAgent && !params.toolsEffectiveError
      ? flattenEffectiveTools(params.toolsEffectiveResult?.groups)
      : [];
  const uniqueEffectiveTools = Array.from(
    new Map(effectiveTools.map((tool) => [normalizeToolName(tool.id), tool])).values(),
  );
  const visibleEffectiveTools = uniqueEffectiveTools.slice(0, MAX_RUNTIME_TOOL_CHIPS);
  const hiddenEffectiveToolCount = Math.max(
    0,
    uniqueEffectiveTools.length - visibleEffectiveTools.length,
  );
  const liveToolCount = uniqueEffectiveTools.length;
  const activeToolMap = new Map(
    effectiveTools.map((tool) => [normalizeToolName(tool.id), tool] as const),
  );
  const activeToolIds = new Set(activeToolMap.keys());

  const sortSectionTools = (tools: AgentToolEntry[]) =>
    tools.toSorted((left, right) => {
      const leftId = normalizeToolName(left.id);
      const rightId = normalizeToolName(right.id);
      const leftActive = activeToolIds.has(leftId) ? 1 : 0;
      const rightActive = activeToolIds.has(rightId) ? 1 : 0;
      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }
      const leftAllowed = resolveAllowed(left.id).allowed ? 1 : 0;
      const rightAllowed = resolveAllowed(right.id).allowed ? 1 : 0;
      if (leftAllowed !== rightAllowed) {
        return rightAllowed - leftAllowed;
      }
      return left.label.localeCompare(right.label);
    });

  const updateTool = (toolId: string, nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const baseAllowed = resolveAllowed(toolId).baseAllowed;
    const normalized = normalizeToolName(toolId);
    if (nextEnabled) {
      nextDeny.delete(normalized);
      if (!baseAllowed) {
        nextAllow.add(normalized);
      }
    } else {
      nextAllow.delete(normalized);
      nextDeny.add(normalized);
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  const updateAll = (nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    for (const toolId of toolIds) {
      const baseAllowed = resolveAllowed(toolId).baseAllowed;
      const normalized = normalizeToolName(toolId);
      if (nextEnabled) {
        nextDeny.delete(normalized);
        if (!baseAllowed) {
          nextAllow.add(normalized);
        }
      } else {
        nextAllow.delete(normalized);
        nextDeny.add(normalized);
      }
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  return html`
    <section class="card">
      <div class="agent-tools-header">
        <div class="agent-tools-header__intro">
          <div class="card-title">${t("rawUi.agents_panels_tools_skills_text_dd32526ddcc0")}</div>
          <div class="card-sub">
            ${t("rawUi.agents_panels_tools_skills_text_4b5c46c15b45")}
            <span class="mono">${enabledCount}/${toolIds.length}</span> ${t(
              "rawUi.agents_panels_tools_skills_text_5fea08f27351",
            )}
          </div>
        </div>
        <div class="agent-tools-header__actions">
          <button class="btn btn--sm" ?disabled=${!editable} @click=${() => updateAll(true)}>
            ${t("rawUi.agents_panels_tools_skills_text_feb1e08b4981")}
          </button>
          <button class="btn btn--sm" ?disabled=${!editable} @click=${() => updateAll(false)}>
            ${t("rawUi.agents_panels_tools_skills_text_01a7dcb7896d")}
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${params.configLoading}
            @click=${params.onConfigReload}
          >
            ${t("common.reloadConfig")}
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving
              ? t("rawUi.agents_panels_tools_skills_dynamic_2f461669a399")
              : t("rawUi.agents_panels_tools_skills_dynamic_a38500b9c9c9")}
          </button>
        </div>
      </div>

      ${!params.configForm
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_de56ecfbf026")}
            </div>
          `
        : nothing}
      ${hasAgentAllow
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_bb8044430fad")}
            </div>
          `
        : nothing}
      ${hasGlobalAllow
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_a0d80c6772a5")}
            </div>
          `
        : nothing}
      ${params.toolsCatalogLoading && !params.toolsCatalogResult && !params.toolsCatalogError
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_210aedbeb282")}
            </div>
          `
        : nothing}
      ${params.toolsCatalogError
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_830d957624d4")}
            </div>
          `
        : nothing}

      <div class="agent-tools-overview">
        <div class="agent-tools-overview__primary">
          <div class="agent-tools-pane">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_ff4ee882ab9c")}</div>
            <div class="card-sub">
              ${t("rawUi.agents_panels_tools_skills_text_e34bd8d8c4aa")}
              <span class="mono"
                >${params.runtimeSessionKey ||
                t("rawUi.agents_panels_tools_skills_dynamic_a4c47829e21d")}</span
              >
            </div>
            ${renderEffectiveToolNotices(params.toolsEffectiveResult)}
            ${!params.runtimeSessionMatchesSelectedAgent
              ? html`
                  <div class="callout info" style="margin-top: 12px">
                    ${t("rawUi.agents_panels_tools_skills_text_26aefb81a285")}
                  </div>
                `
              : params.toolsEffectiveLoading &&
                  !params.toolsEffectiveResult &&
                  !params.toolsEffectiveError
                ? html`
                    <div class="callout info" style="margin-top: 12px">
                      ${t("rawUi.agents_panels_tools_skills_text_17f88e68c0dd")}
                    </div>
                  `
                : params.toolsEffectiveError
                  ? html`
                      <div class="callout info" style="margin-top: 12px">
                        ${t("rawUi.agents_panels_tools_skills_text_4470a8dd39b8")}
                      </div>
                    `
                  : (params.toolsEffectiveResult?.groups?.length ?? 0) === 0
                    ? html`
                        <div class="callout info" style="margin-top: 12px">
                          ${t("rawUi.agents_panels_tools_skills_text_1e1ecb31e316")}
                        </div>
                      `
                    : html`
                        <div class="agent-tools-runtime">
                          ${visibleEffectiveTools.map((tool) => {
                            const anchorId = toToolAnchorId(tool.id);
                            return html`
                              <a
                                class="agent-tools-runtime-chip"
                                href="#${anchorId}"
                                @click=${(event: Event) => handleRuntimeToolJump(event, anchorId)}
                              >
                                <span class="mono" translate="no">${tool.label}</span>
                                <span class="agent-tools-runtime-chip__meta"
                                  >${renderEffectiveToolBadge(tool)}</span
                                >
                              </a>
                            `;
                          })}
                          ${hiddenEffectiveToolCount > 0
                            ? html`
                                <span
                                  class="agent-tools-runtime-chip agent-tools-runtime-chip--${t(
                                    "rawUi.agents_panels_tools_skills_fragment_b8d3ff265a92",
                                  )}"
                                  title=${t(
                                    "rawUi.agents_panels_tools_skills_dynamic_moreLiveTools",
                                    { count: String(hiddenEffectiveToolCount) },
                                  )}
                                >
                                  +${hiddenEffectiveToolCount}
                                  ${t("rawUi.agents_panels_tools_skills_fragment_b8d3ff265a92")}
                                </span>
                              `
                            : nothing}
                        </div>
                      `}
          </div>

          <div class="agent-tools-pane">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_d58f87e68d03")}</div>
            <div class="agent-tools-buttons">
              ${profileOptions.map(
                (option) => html`
                  <button
                    class="btn btn--sm ${profile === option.id ? "active" : ""}"
                    ?disabled=${!editable}
                    @click=${() => params.onProfileChange(params.agentId, option.id, true)}
                  >
                    ${option.label}
                  </button>
                `,
              )}
              <button
                class="btn btn--sm"
                ?disabled=${!editable}
                @click=${() => params.onProfileChange(params.agentId, null, false)}
              >
                ${t("rawUi.agents_panels_tools_skills_text_c5267430c8e4")}
              </button>
            </div>
          </div>
        </div>

        <div class="agent-tools-facts">
          <div class="agent-tools-fact">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_ff512356b34a")}</div>
            <div class="mono">${profile}</div>
          </div>
          <div class="agent-tools-fact">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_8a02c3ab14de")}</div>
            <div>${profileSource}</div>
          </div>
          <div class="agent-tools-fact">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_f5e10daac363")}</div>
            <div class="mono">${enabledCount}/${toolIds.length}</div>
          </div>
          <div class="agent-tools-fact">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_662776235072")}</div>
            <div class="mono">${liveToolCount}</div>
          </div>
          <div class="agent-tools-fact">
            <div class="label">${t("rawUi.agents_panels_tools_skills_text_25e6cb814341")}</div>
            <div class="mono">
              ${params.configSaving
                ? t("rawUi.agents_panels_tools_skills_dynamic_13d7f2ef90a9")
                : params.configDirty
                  ? t("rawUi.agents_panels_tools_skills_dynamic_54074d798e9f")
                  : t("rawUi.agents_panels_tools_skills_dynamic_51a8571ce4e9")}
            </div>
          </div>
        </div>
      </div>

      <div class="agent-tools-grid">
        ${toolSections.map((section) => {
          const sortedTools = sortSectionTools(section.tools);
          const enabledSectionCount = section.tools.filter(
            (tool) => resolveAllowed(tool.id).allowed,
          ).length;
          const activeSectionCount = section.tools.filter((tool) =>
            activeToolIds.has(normalizeToolName(tool.id)),
          ).length;
          const previewTools = sortedTools.slice(0, 4);
          const remainingPreviewCount = Math.max(0, sortedTools.length - previewTools.length);
          return html`
            <details class="agent-tools-group" @toggle=${handleToolGroupToggle}>
              <summary class="agent-tools-group__summary">
                <span class="agent-tools-group__summary-main">
                  <span class="agent-tools-group__title">
                    ${section.label}
                    ${section.source === "plugin" && section.pluginId
                      ? html`<span class="agent-pill"
                          >${t("rawUi.agents_panels_tools_skills_fragment_31633e89405c")}
                          ${section.pluginId}</span
                        >`
                      : nothing}
                  </span>
                  <span
                    class="agent-tools-group__preview"
                    aria-label=${t("rawUi.agents_panels_tools_skills_attr_e3dbcd5a64e5")}
                  >
                    ${previewTools.map(
                      (tool) =>
                        html`<span class="mono" translate="no" title=${tool.label}
                          >${tool.label}</span
                        >`,
                    )}
                    ${remainingPreviewCount > 0
                      ? html`<span
                          >+${remainingPreviewCount}
                          ${t("rawUi.agents_panels_tools_skills_fragment_b8d3ff265a92")}</span
                        >`
                      : nothing}
                  </span>
                </span>
                <span class="agent-tools-group__counts">
                  <span
                    >${t(
                      section.tools.length === 1
                        ? "rawUi.agents_tools_count_totalOne"
                        : "rawUi.agents_tools_count_totalMany",
                      {
                        count: String(section.tools.length),
                      },
                    )}</span
                  >
                  <span
                    >${t(
                      enabledSectionCount === 1
                        ? "rawUi.agents_tools_count_enabledOne"
                        : "rawUi.agents_tools_count_enabledMany",
                      {
                        count: String(enabledSectionCount),
                      },
                    )}</span
                  >
                  ${activeSectionCount > 0
                    ? html`<span
                        >${t(
                          activeSectionCount === 1
                            ? "rawUi.agents_tools_count_liveOne"
                            : "rawUi.agents_tools_count_liveMany",
                          {
                            count: String(activeSectionCount),
                          },
                        )}</span
                      >`
                    : nothing}
                </span>
              </summary>
              <div class="agent-tools-list agent-tools-list--stacked">
                ${sortedTools.map((tool) => {
                  const anchorId = toToolAnchorId(tool.id);
                  const resolved = resolveAllowed(tool.id);
                  const activeEntry = activeToolMap.get(normalizeToolName(tool.id)) ?? null;
                  const defaultProfiles = tool.defaultProfiles ?? [];
                  const rowBadges = buildRowStatusBadges({
                    section,
                    tool,
                    activeEntry,
                  });
                  const accessSummary = formatToolAccessSummary(resolved);
                  const runtimeSummary = formatToolRuntimeSummary({
                    activeEntry,
                    runtimeSessionMatchesSelectedAgent: params.runtimeSessionMatchesSelectedAgent,
                  });
                  return html`
                    <details class="agent-tool-card" id=${anchorId}>
                      <summary class="agent-tool-summary">
                        <div class="agent-tool-summary__main">
                          <div class="agent-tool-summary__title-row">
                            <span class="agent-tool-title mono" translate="no">${tool.label}</span>
                          </div>
                          <div class="agent-tool-sub">${tool.description}</div>
                        </div>
                        <dl class="agent-tool-summary__facts">
                          <div class="agent-tool-summary__fact">
                            <dt class="label">
                              ${t("rawUi.agents_panels_tools_skills_text_40ebe4410c8b")}
                            </dt>
                            <dd>${accessSummary}</dd>
                          </div>
                          <div class="agent-tool-summary__fact">
                            <dt class="label">
                              ${t("rawUi.agents_panels_tools_skills_text_362651bdff73")}
                            </dt>
                            <dd>${runtimeSummary}</dd>
                          </div>
                        </dl>
                        <div class="agent-tool-summary__badges">
                          ${renderToolMetaBadges(rowBadges)}
                        </div>
                        <label
                          class="cfg-toggle agent-tool-toggle"
                          @click=${(event: Event) => event.stopPropagation()}
                          @keydown=${(event: KeyboardEvent) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            .checked=${resolved.allowed}
                            ?disabled=${!editable}
                            aria-label=${`${resolved.allowed ? t("rawUi.agents_panels_tools_skills_dynamic_279920937791") : t("rawUi.agents_panels_tools_skills_dynamic_6c7babdf511d")} ${tool.label}`}
                            @change=${(e: Event) =>
                              updateTool(tool.id, (e.target as HTMLInputElement).checked)}
                          />
                          <span class="cfg-toggle__track"></span>
                        </label>
                      </summary>
                      <div class="agent-tool-details">
                        <div class="agent-tool-details-strip">
                          <div class="agent-tool-detail agent-tool-detail--inline">
                            <div class="label">
                              ${t("rawUi.agents_panels_tools_skills_text_40ebe4410c8b")}
                            </div>
                            <div>${formatToolPolicyState(resolved)}</div>
                          </div>
                          <div class="agent-tool-detail agent-tool-detail--inline">
                            <div class="label">
                              ${t("rawUi.agents_panels_tools_skills_text_8a02c3ab14de")}
                            </div>
                            <div>${formatToolSourceLabel(section, tool)}</div>
                          </div>
                          ${defaultProfiles.length > 0
                            ? html`
                                <div class="agent-tool-detail agent-tool-detail--inline">
                                  <div class="label">
                                    ${t("rawUi.agents_panels_tools_skills_text_79ea20deadde")}
                                  </div>
                                  <div class="agent-tool-badges">
                                    ${defaultProfiles.map(
                                      (profileId) =>
                                        html`<span class="agent-pill">${profileId}</span>`,
                                    )}
                                  </div>
                                </div>
                              `
                            : nothing}
                          <div class="agent-tool-detail agent-tool-detail--inline">
                            <div class="label">
                              ${t("rawUi.agents_panels_tools_skills_text_8ecf135749ba")}
                            </div>
                            <div>
                              ${activeEntry
                                ? html`${t(
                                    "rawUi.agents_panels_tools_skills_dynamic_availableNowVia",
                                  )}
                                  ${renderEffectiveToolBadge(activeEntry)}.`
                                : params.runtimeSessionMatchesSelectedAgent
                                  ? t("rawUi.agents_panels_tools_skills_dynamic_3a313a53a280")
                                  : t("rawUi.agents_panels_tools_skills_dynamic_0f8051b2f288")}
                            </div>
                          </div>
                          <a class="agent-tool-jump" href="#${anchorId}">
                            ${t("rawUi.agents_panels_tools_skills_text_46a151f85a0c")}
                          </a>
                        </div>
                      </div>
                    </details>
                  `;
                })}
              </div>
            </details>
          `;
        })}
      </div>
    </section>
  `;
}

export function renderAgentSkills(params: {
  agentId: string;
  report: SkillStatusReport | null;
  loading: boolean;
  error: string | null;
  activeAgentId: string | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  filter: string;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onClear: (agentId: string) => void;
  onDisableAll: (agentId: string) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const editable = Boolean(params.configForm) && !params.configLoading && !params.configSaving;
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const allowlist = Array.isArray(config.entry?.skills) ? config.entry?.skills : undefined;
  const allowSet = new Set(normalizeStringEntries(allowlist ?? []));
  const usingAllowlist = allowlist !== undefined;
  const reportReady = Boolean(params.report && params.activeAgentId === params.agentId);
  const rawSkills = reportReady ? (params.report?.skills ?? []) : [];
  const filter = normalizeLowercaseStringOrEmpty(params.filter);
  const filtered = filter
    ? rawSkills.filter((skill) =>
        normalizeLowercaseStringOrEmpty(
          [skill.name, skill.description, skill.source].join(" "),
        ).includes(filter),
      )
    : rawSkills;
  const groups = groupSkills(filtered);
  const enabledCount = usingAllowlist
    ? rawSkills.filter((skill) => allowSet.has(skill.name)).length
    : rawSkills.length;
  const totalCount = rawSkills.length;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; flex-wrap: wrap;">
        <div style="min-width: 0;">
          <div class="card-title">${t("rawUi.agents_panels_tools_skills_text_bdebed6fe78f")}</div>
          <div class="card-sub">
            ${t("rawUi.agents_panels_tools_skills_fragment_b1836255e098")}
            ${totalCount > 0
              ? html`<span class="mono">${enabledCount}/${totalCount}</span>`
              : nothing}
          </div>
        </div>
        <div class="row" style="gap: 8px; flex-wrap: wrap;">
          <div
            class="row"
            style="gap: 4px; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 2px;"
          >
            <button
              class="btn btn--sm"
              ?disabled=${!editable}
              @click=${() => params.onClear(params.agentId)}
            >
              ${t("rawUi.agents_panels_tools_skills_text_feb1e08b4981")}
            </button>
            <button
              class="btn btn--sm"
              ?disabled=${!editable}
              @click=${() => params.onDisableAll(params.agentId)}
            >
              ${t("rawUi.agents_panels_tools_skills_text_01a7dcb7896d")}
            </button>
            <button
              class="btn btn--sm"
              ?disabled=${!editable || !usingAllowlist}
              @click=${() => params.onClear(params.agentId)}
              title=${t("rawUi.agents_panels_tools_skills_attr_ac0f15fb7735")}
            >
              ${t("rawUi.agents_panels_tools_skills_text_eab47f5079fc")}
            </button>
          </div>
          <button
            class="btn btn--sm"
            ?disabled=${params.configLoading}
            @click=${params.onConfigReload}
          >
            ${t("common.reloadConfig")}
          </button>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? t("common.loading") : t("common.refresh")}
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving
              ? t("rawUi.agents_panels_tools_skills_dynamic_2f461669a399")
              : t("rawUi.agents_panels_tools_skills_dynamic_a38500b9c9c9")}
          </button>
        </div>
      </div>

      ${!params.configForm
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_23499cc125c9")}
            </div>
          `
        : nothing}
      ${usingAllowlist
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_daf2dc1d8030")}
            </div>
          `
        : html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_c56a7e51f997")}
            </div>
          `}
      ${!reportReady && !params.loading
        ? html`
            <div class="callout info" style="margin-top: 12px">
              ${t("rawUi.agents_panels_tools_skills_text_66778443055d")}
            </div>
          `
        : nothing}
      ${params.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
        : nothing}

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>${t("rawUi.agents_panels_tools_skills_text_27daceb8f466")}</span>
          <input
            .value=${params.filter}
            @input=${(e: Event) => params.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder=${t("rawUi.agents_panels_tools_skills_attr_2054d8a7b1d6")}
            autocomplete="off"
            name="agent-skills-filter"
          />
        </label>
        <div class="muted">
          ${filtered.length} ${t("rawUi.agents_panels_tools_skills_fragment_8d63d867da8a")}
        </div>
      </div>

      ${filtered.length === 0
        ? html`
            <div class="muted" style="margin-top: 16px">
              ${t("rawUi.agents_panels_tools_skills_text_bf6f7f2a1860")}
            </div>
          `
        : html`
            <div class="agent-skills-groups" style="margin-top: 16px;">
              ${groups.map((group) =>
                renderAgentSkillGroup(group, {
                  agentId: params.agentId,
                  allowSet,
                  usingAllowlist,
                  editable,
                  onToggle: params.onToggle,
                }),
              )}
            </div>
          `}
    </section>
  `;
}

function renderAgentSkillGroup(
  group: SkillGroup,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const collapsedByDefault = group.id === "workspace" || group.id === "built-in";
  return html`
    <details class="agent-skills-group" ?open=${!collapsedByDefault}>
      <summary class="agent-skills-header">
        <span>${group.label}</span>
        <span class="muted">${group.skills.length}</span>
      </summary>
      <div class="list skills-grid">
        ${group.skills.map((skill) =>
          renderAgentSkillRow(skill, {
            agentId: params.agentId,
            allowSet: params.allowSet,
            usingAllowlist: params.usingAllowlist,
            editable: params.editable,
            onToggle: params.onToggle,
          }),
        )}
      </div>
    </details>
  `;
}

function renderAgentSkillRow(
  skill: SkillStatusEntry,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const enabled = params.usingAllowlist ? params.allowSet.has(skill.name) : true;
  const missing = computeSkillMissing(skill);
  const reasons = computeSkillReasons(skill);
  return html`
    <div class="list-item agent-skill-row">
      <div class="list-main">
        <div class="list-title">${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}</div>
        <div class="list-sub">${skill.description}</div>
        ${renderSkillStatusChips({ skill })}
        ${missing.length > 0
          ? html`<div class="muted" style="margin-top: 6px;">
              ${t("rawUi.agents_panels_tools_skills_fragment_897a1b26addb")} ${missing.join(", ")}
            </div>`
          : nothing}
        ${reasons.length > 0
          ? html`<div class="muted" style="margin-top: 6px;">
              ${t("rawUi.agents_panels_tools_skills_fragment_9c281c9a4f0b")} ${reasons.join(", ")}
            </div>`
          : nothing}
      </div>
      <div class="list-meta">
        <label class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${enabled}
            ?disabled=${!params.editable}
            @change=${(e: Event) =>
              params.onToggle(params.agentId, skill.name, (e.target as HTMLInputElement).checked)}
          />
          <span class="cfg-toggle__track"></span>
        </label>
      </div>
    </div>
  `;
}
