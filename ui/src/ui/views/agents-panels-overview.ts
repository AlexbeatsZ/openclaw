// Control UI view renders agents panels overview screen content.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type {
  AgentIdentityResult,
  AgentsFilesListResult,
  AgentsListResult,
  ModelCatalogEntry,
} from "../types.ts";
import {
  buildModelOptions,
  normalizeModelValue,
  parseFallbackList,
  resolveAgentConfig,
  resolveAgentRuntimeLabel,
  resolveModelFallbacks,
  resolveModelLabel,
  resolveModelPrimary,
} from "./agents-utils.ts";
import type { AgentsPanel } from "./agents.types.ts";

export function renderAgentOverview(params: {
  agent: AgentsListResult["agents"][number];
  basePath: string;
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  modelCatalog: ModelCatalogEntry[];
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onSelectPanel: (panel: AgentsPanel) => void;
}) {
  const {
    agent,
    configForm,
    agentFilesList,
    configLoading,
    configSaving,
    configDirty,
    onConfigReload,
    onConfigSave,
    onModelChange,
    onModelFallbacksChange,
    onSelectPanel,
  } = params;
  const isDefault = Boolean(params.defaultId && agent.id === params.defaultId);
  const config = resolveAgentConfig(configForm, agent.id);
  const agentModel = agent.model;
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles ||
    config.entry?.workspace ||
    config.defaults?.workspace ||
    agent.workspace ||
    "default";
  const model = config.entry?.model
    ? resolveModelLabel(config.entry?.model)
    : config.defaults?.model
      ? resolveModelLabel(config.defaults?.model)
      : resolveModelLabel(agentModel);
  const runtime = resolveAgentRuntimeLabel(agent.agentRuntime);
  const defaultModel = resolveModelLabel(config.defaults?.model ?? agentModel);
  const entryPrimary = resolveModelPrimary(config.entry?.model);
  const defaultPrimary =
    resolveModelPrimary(config.defaults?.model) ||
    (defaultModel !== "-" ? normalizeModelValue(defaultModel) : null) ||
    (configForm ? null : resolveModelPrimary(agentModel));
  const effectivePrimary = entryPrimary ?? defaultPrimary ?? null;
  const selectedPrimary = isDefault ? effectivePrimary : entryPrimary;
  const modelFallbacks =
    resolveModelFallbacks(config.entry?.model) ??
    resolveModelFallbacks(config.defaults?.model) ??
    (configForm ? null : resolveModelFallbacks(agentModel));
  const fallbackChips = modelFallbacks ?? [];
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  const disabled = !configForm || configLoading || configSaving;
  const thinkingDefault = agent.thinkingDefault ?? "-";

  const removeChip = (index: number) => {
    const next = fallbackChips.filter((_, i) => i !== index);
    onModelFallbacksChange(agent.id, next);
  };

  const handleChipKeydown = (e: KeyboardEvent) => {
    const input = e.target as HTMLInputElement;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const parsed = parseFallbackList(input.value);
      if (parsed.length > 0) {
        onModelFallbacksChange(agent.id, [...fallbackChips, ...parsed]);
        input.value = "";
      }
    }
  };

  return html`
    <section class="card">
      <div class="card-title">${t("rawUi.agents_panels_overview_text_318d96a79fd3")}</div>
      <div class="card-sub">${t("rawUi.agents_panels_overview_text_d27b2409672b")}</div>

      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">${t("rawUi.agents_panels_overview_text_e4fdf7339a35")}</div>
          <div>
            <button
              type="button"
              class="workspace-link mono"
              @click=${() => onSelectPanel("files")}
              title=${t("rawUi.agents_panels_overview_attr_25a9c38d27cc")}
            >
              ${workspace}
            </button>
          </div>
        </div>
        <div class="agent-kv">
          <div class="label">${t("rawUi.agents_panels_overview_text_6999ae96afe4")}</div>
          <div class="mono">${model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">${t("rawUi.agents_panels_overview_text_400d3cb80e4a")}</div>
          <div class="mono">${runtime}</div>
        </div>
        <div class="agent-kv">
          <div class="label">${t("agents.context.thinkingDefault")}</div>
          <div class="mono">${thinkingDefault}</div>
        </div>
        <div class="agent-kv">
          <div class="label">${t("rawUi.agents_panels_overview_text_6e229ecf2305")}</div>
          <div>
            ${skillFilter
              ? t("rawUi.agents_panels_overview_dynamic_selectedCount", {
                  count: String(skillCount),
                })
              : t("rawUi.agents_panels_overview_dynamic_e4fc14ef8082")}
          </div>
        </div>
      </div>

      ${configDirty
        ? html`
            <div class="callout warn" style="margin-top: 16px">
              ${t("rawUi.agents_panels_overview_text_7161ec0c47a9")}
            </div>
          `
        : nothing}

      <div class="agent-model-select" style="margin-top: 20px;">
        <div class="label">${t("rawUi.agents_panels_overview_text_b78259d7927a")}</div>
        <div class="agent-model-fields">
          <label class="field">
            <span
              >${t("rawUi.agents_panels_overview_fragment_a76e5c732bd1")}${isDefault
                ? t("rawUi.agents_panels_overview_dynamic_d7532b47a20f")
                : ""}</span
            >
            <select
              .value=${selectedPrimary ?? ""}
              ?disabled=${disabled}
              @change=${(e: Event) =>
                onModelChange(agent.id, (e.target as HTMLSelectElement).value || null)}
            >
              ${isDefault
                ? html`
                    <option value="" ?selected=${!selectedPrimary}>
                      ${t("rawUi.agents_panels_overview_text_3fd6178df2cf")}
                    </option>
                  `
                : html`
                    <option value="" ?selected=${!selectedPrimary}>
                      ${defaultPrimary
                        ? t("rawUi.agents_panels_overview_dynamic_inheritDefaultModel", {
                            model: defaultPrimary,
                          })
                        : t("rawUi.agents_panels_overview_dynamic_785f316683c2")}
                    </option>
                  `}
              ${buildModelOptions(
                configForm,
                effectivePrimary ?? undefined,
                params.modelCatalog,
                selectedPrimary,
              )}
            </select>
          </label>
          <div class="field">
            <span>${t("rawUi.agents_panels_overview_text_e421116f3cc3")}</span>
            <div
              class="agent-chip-input"
              @click=${(e: Event) => {
                const container = e.currentTarget as HTMLElement;
                const input = container.querySelector("input");
                if (input) {
                  input.focus();
                }
              }}
            >
              ${fallbackChips.map(
                (chip, i) => html`
                  <span class="chip">
                    ${chip}
                    <button
                      type="button"
                      class="chip-remove"
                      ?disabled=${disabled}
                      @click=${() => removeChip(i)}
                    >
                      ${t("rawUi.agents_panels_overview_text_695a7f920355")}
                    </button>
                  </span>
                `,
              )}
              <input
                ?disabled=${disabled}
                placeholder=${fallbackChips.length === 0 ? "provider/model" : ""}
                @keydown=${handleChipKeydown}
                @blur=${(e: Event) => {
                  const input = e.target as HTMLInputElement;
                  const parsed = parseFallbackList(input.value);
                  if (parsed.length > 0) {
                    onModelFallbacksChange(agent.id, [...fallbackChips, ...parsed]);
                    input.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div class="agent-model-actions">
          <button
            type="button"
            class="btn btn--sm"
            ?disabled=${configLoading}
            @click=${onConfigReload}
          >
            ${t("common.reloadConfig")}
          </button>
          <button
            type="button"
            class="btn btn--sm primary"
            ?disabled=${configSaving || !configDirty}
            @click=${onConfigSave}
          >
            ${configSaving
              ? t("rawUi.agents_panels_overview_dynamic_4283aa4c7807")
              : t("rawUi.agents_panels_overview_dynamic_bba6c7d78cf9")}
          </button>
        </div>
      </div>
    </section>
  `;
}
