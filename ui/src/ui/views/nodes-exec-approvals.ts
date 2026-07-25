// Control UI view renders nodes exec approvals screen content.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type {
  ExecApprovalsAllowlistEntry,
  ExecApprovalsFile,
} from "../controllers/exec-approvals.ts";
import { clampText, formatRelativeTimestamp } from "../format.ts";
import {
  resolveConfigAgents as resolveSharedConfigAgents,
  resolveNodeTargets,
  type NodeTargetOption,
} from "./nodes-shared.ts";
import type { NodesProps } from "./nodes.types.ts";

type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";

type ExecApprovalsResolvedDefaults = {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
};

type ExecApprovalsAgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

type ExecApprovalsTargetNode = NodeTargetOption;

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: ExecApprovalsResolvedDefaults;
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: ExecApprovalsAgentOption[];
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: ExecApprovalsTargetNode[];
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

const SECURITY_OPTIONS: Array<{ value: ExecSecurity; label: string }> = [
  {
    value: "deny",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_9a3ad3bdd8b4");
    },
  },
  {
    value: "allowlist",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_774604deefd0");
    },
  },
  {
    value: "full",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_3d53f475ecea");
    },
  },
];

const ASK_OPTIONS: Array<{ value: ExecAsk; label: string }> = [
  {
    value: "off",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_7489033f7b74");
    },
  },
  {
    value: "on-miss",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_79e608c86466");
    },
  },
  {
    value: "always",
    get label() {
      return t("rawUi.nodes_exec_approvals_prop_79ab065f676b");
    },
  },
];

function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") {
    return value;
  }
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") {
    return value;
  }
  return "on-miss";
}

function resolveExecApprovalsDefaults(
  form: ExecApprovalsFile | null,
): ExecApprovalsResolvedDefaults {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: defaults.autoAllowSkills ?? false,
  };
}

function resolveConfigAgents(config: Record<string, unknown> | null): ExecApprovalsAgentOption[] {
  return resolveSharedConfigAgents(config).map((entry) => ({
    id: entry.id,
    name: entry.name,
    isDefault: entry.isDefault,
  }));
}

function resolveExecApprovalsAgents(
  config: Record<string, unknown> | null,
  form: ExecApprovalsFile | null,
): ExecApprovalsAgentOption[] {
  const configAgents = resolveConfigAgents(config);
  const approvalsAgents = Object.keys(form?.agents ?? {});
  const merged = new Map<string, ExecApprovalsAgentOption>();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) {
      return;
    }
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if (agents.length === 0) {
    agents.push({ id: "main", isDefault: true });
  }
  agents.sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1;
    }
    if (!a.isDefault && b.isDefault) {
      return 1;
    }
    const aLabel = a.name?.trim() ? a.name : a.id;
    const bLabel = b.name?.trim() ? b.name : b.id;
    return aLabel.localeCompare(bLabel);
  });
  return agents;
}

function resolveExecApprovalsScope(
  selected: string | null,
  agents: ExecApprovalsAgentOption[],
): string {
  if (selected === EXEC_APPROVALS_DEFAULT_SCOPE) {
    return EXEC_APPROVALS_DEFAULT_SCOPE;
  }
  if (selected && agents.some((agent) => agent.id === selected)) {
    return selected;
  }
  return EXEC_APPROVALS_DEFAULT_SCOPE;
}

export function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  let targetNodeId =
    target === "node" && props.execApprovalsTargetNodeId ? props.execApprovalsTargetNodeId : null;
  if (target === "node" && targetNodeId && !targetNodes.some((node) => node.id === targetNodeId)) {
    targetNodeId = null;
  }
  const selectedScope = resolveExecApprovalsScope(props.execApprovalsSelectedAgent, agents);
  const selectedAgent =
    selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE
      ? (((form?.agents ?? {})[selectedScope] as Record<string, unknown> | undefined) ?? null)
      : null;
  const allowlist = Array.isArray((selectedAgent as { allowlist?: unknown })?.allowlist)
    ? ((selectedAgent as { allowlist?: ExecApprovalsAllowlistEntry[] }).allowlist ?? [])
    : [];
  return {
    ready,
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form,
    defaults,
    selectedScope,
    selectedAgent,
    agents,
    allowlist,
    target,
    targetNodeId,
    targetNodes,
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}

export function renderExecApprovals(state: ExecApprovalsState) {
  const ready = state.ready;
  const targetReady = state.target !== "node" || Boolean(state.targetNodeId);
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">${t("rawUi.nodes_exec_approvals_text_16553d228f65")}</div>
          <div class="card-sub">
            ${t("rawUi.nodes_exec_approvals_text_7b1c57641590")}
            <span class="mono">${t("rawUi.nodes_exec_approvals_text_63c7eef08b9d")}</span>.
          </div>
        </div>
        <button
          class="btn"
          ?disabled=${state.disabled || !state.dirty || !targetReady}
          @click=${state.onSave}
        >
          ${state.saving
            ? t("rawUi.nodes_exec_approvals_dynamic_9f343ab8246f")
            : t("rawUi.nodes_exec_approvals_dynamic_ff9e3653b553")}
        </button>
      </div>

      ${renderExecApprovalsTarget(state)}
      ${!ready
        ? html`<div class="row" style="margin-top: 12px; gap: 12px;">
            <div class="muted">${t("rawUi.nodes_exec_approvals_text_4f778a750cdb")}</div>
            <button class="btn" ?disabled=${state.loading || !targetReady} @click=${state.onLoad}>
              ${state.loading ? t("common.loading") : t("common.loadApprovals")}
            </button>
          </div>`
        : html`
            ${renderExecApprovalsTabs(state)} ${renderExecApprovalsPolicy(state)}
            ${state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE
              ? nothing
              : renderExecApprovalsAllowlist(state)}
          `}
    </section>
  `;
}

function renderExecApprovalsTarget(state: ExecApprovalsState) {
  const hasNodes = state.targetNodes.length > 0;
  const nodeValue = state.targetNodeId ?? "";
  return html`
    <div class="list" style="margin-top: 12px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${t("rawUi.nodes_exec_approvals_text_1ffe381dae39")}</div>
          <div class="list-sub">${t("rawUi.nodes_exec_approvals_text_3bfed81ffd41")}</div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>${t("rawUi.nodes_exec_approvals_text_e2379e216a5a")}</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (value === "node") {
                  const first = state.targetNodes[0]?.id ?? null;
                  state.onSelectTarget("node", nodeValue || first);
                } else {
                  state.onSelectTarget("gateway", null);
                }
              }}
            >
              <option value="gateway" ?selected=${state.target === "gateway"}>
                ${t("rawUi.nodes_exec_approvals_text_a14619266d83")}
              </option>
              <option value="node" ?selected=${state.target === "node"}>
                ${t("rawUi.nodes_exec_approvals_text_feafac6035bd")}
              </option>
            </select>
          </label>
          ${state.target === "node"
            ? html`
                <label class="field">
                  <span>${t("rawUi.nodes_exec_approvals_text_feafac6035bd")}</span>
                  <select
                    ?disabled=${state.disabled || !hasNodes}
                    @change=${(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      const value = target.value.trim();
                      state.onSelectTarget("node", value ? value : null);
                    }}
                  >
                    <option value="" ?selected=${nodeValue === ""}>
                      ${t("rawUi.nodes_exec_approvals_text_93d2d310fb7e")}
                    </option>
                    ${state.targetNodes.map(
                      (node) =>
                        html`<option value=${node.id} ?selected=${nodeValue === node.id}>
                          ${node.label}
                        </option>`,
                    )}
                  </select>
                </label>
              `
            : nothing}
        </div>
      </div>
      ${state.target === "node" && !hasNodes
        ? html` <div class="muted">${t("rawUi.nodes_exec_approvals_text_d6d5c3ebb421")}</div> `
        : nothing}
    </div>
  `;
}

function renderExecApprovalsTabs(state: ExecApprovalsState) {
  return html`
    <div class="row" style="margin-top: 12px; gap: 8px; flex-wrap: wrap;">
      <span class="label">${t("rawUi.nodes_exec_approvals_text_5f0d82e0b5a8")}</span>
      <div class="row" style="gap: 8px; flex-wrap: wrap;">
        <button
          class="btn btn--sm ${state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE
            ? "active"
            : ""}"
          @click=${() => state.onSelectScope(EXEC_APPROVALS_DEFAULT_SCOPE)}
        >
          ${t("rawUi.nodes_exec_approvals_text_1d238ec961c1")}
        </button>
        ${state.agents.map((agent) => {
          const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
          return html`
            <button
              class="btn btn--sm ${state.selectedScope === agent.id ? "active" : ""}"
              @click=${() => state.onSelectScope(agent.id)}
            >
              ${label}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

function renderExecApprovalsPolicy(state: ExecApprovalsState) {
  const isDefaults = state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE;
  const defaults = state.defaults;
  const agent = state.selectedAgent ?? {};
  const basePath = isDefaults ? ["defaults"] : ["agents", state.selectedScope];
  const agentSecurity = typeof agent.security === "string" ? agent.security : undefined;
  const agentAsk = typeof agent.ask === "string" ? agent.ask : undefined;
  const agentAskFallback = typeof agent.askFallback === "string" ? agent.askFallback : undefined;
  const securityValue = isDefaults ? defaults.security : (agentSecurity ?? "__default__");
  const askValue = isDefaults ? defaults.ask : (agentAsk ?? "__default__");
  const askFallbackValue = isDefaults ? defaults.askFallback : (agentAskFallback ?? "__default__");
  const autoOverride =
    typeof agent.autoAllowSkills === "boolean" ? agent.autoAllowSkills : undefined;
  const autoEffective = autoOverride ?? defaults.autoAllowSkills;
  const autoIsDefault = autoOverride == null;

  return html`
    <div class="list" style="margin-top: 16px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${t("rawUi.nodes_exec_approvals_text_1957560b4f38")}</div>
          <div class="list-sub">
            ${isDefaults
              ? t("rawUi.nodes_exec_approvals_dynamic_14cdafa5a84b")
              : t("rawUi.nodes_exec_approvals_dynamic_defaultValue", {
                  value: defaults.security,
                })}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>${t("rawUi.nodes_exec_approvals_text_e6c451f5ad5d")}</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "security"]);
                } else {
                  state.onPatch([...basePath, "security"], value);
                }
              }}
            >
              ${!isDefaults
                ? html`<option value="__default__" ?selected=${securityValue === "__default__"}>
                    ${t("rawUi.nodes_exec_approvals_fragment_c50b2bc770cb")}${defaults.security})
                  </option>`
                : nothing}
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option value=${option.value} ?selected=${securityValue === option.value}>
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${t("rawUi.nodes_exec_approvals_text_bfa959799be0")}</div>
          <div class="list-sub">
            ${isDefaults
              ? t("rawUi.nodes_exec_approvals_dynamic_b8ff54df5cbd")
              : t("rawUi.nodes_exec_approvals_dynamic_defaultValue", {
                  value: defaults.ask,
                })}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>${t("rawUi.nodes_exec_approvals_text_e6c451f5ad5d")}</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "ask"]);
                } else {
                  state.onPatch([...basePath, "ask"], value);
                }
              }}
            >
              ${!isDefaults
                ? html`<option value="__default__" ?selected=${askValue === "__default__"}>
                    ${t("rawUi.nodes_exec_approvals_fragment_c50b2bc770cb")}${defaults.ask})
                  </option>`
                : nothing}
              ${ASK_OPTIONS.map(
                (option) =>
                  html`<option value=${option.value} ?selected=${askValue === option.value}>
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${t("rawUi.nodes_exec_approvals_text_4b27f374e2f2")}</div>
          <div class="list-sub">
            ${isDefaults
              ? t("rawUi.nodes_exec_approvals_dynamic_4efa797e0cdc")
              : t("rawUi.nodes_exec_approvals_dynamic_defaultValue", {
                  value: defaults.askFallback,
                })}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>${t("rawUi.nodes_exec_approvals_text_ffbcf32a5281")}</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "askFallback"]);
                } else {
                  state.onPatch([...basePath, "askFallback"], value);
                }
              }}
            >
              ${!isDefaults
                ? html`<option value="__default__" ?selected=${askFallbackValue === "__default__"}>
                    ${t("rawUi.nodes_exec_approvals_fragment_c50b2bc770cb")}${defaults.askFallback})
                  </option>`
                : nothing}
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option value=${option.value} ?selected=${askFallbackValue === option.value}>
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">${t("rawUi.nodes_exec_approvals_text_94f0794f20b2")}</div>
          <div class="list-sub">
            ${isDefaults
              ? t("rawUi.nodes_exec_approvals_dynamic_bacc126d1a57")
              : autoIsDefault
                ? t("rawUi.nodes_exec_approvals_dynamic_usingDefault", {
                    value: defaults.autoAllowSkills ? "on" : "off",
                  })
                : t("rawUi.nodes_exec_approvals_dynamic_override", {
                    value: autoEffective ? "on" : "off",
                  })}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>${t("rawUi.nodes_exec_approvals_text_9b56f09c56c6")}</span>
            <input
              type="checkbox"
              ?disabled=${state.disabled}
              .checked=${autoEffective}
              @change=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                state.onPatch([...basePath, "autoAllowSkills"], target.checked);
              }}
            />
          </label>
          ${!isDefaults && !autoIsDefault
            ? html`<button
                class="btn btn--sm"
                ?disabled=${state.disabled}
                @click=${() => state.onRemove([...basePath, "autoAllowSkills"])}
              >
                ${t("rawUi.nodes_exec_approvals_text_73754d1dcf80")}
              </button>`
            : nothing}
        </div>
      </div>
    </div>
  `;
}

function renderExecApprovalsAllowlist(state: ExecApprovalsState) {
  const allowlistPath = ["agents", state.selectedScope, "allowlist"];
  const entries = state.allowlist;
  return html`
    <div class="row" style="margin-top: 18px; justify-content: space-between;">
      <div>
        <div class="card-title">${t("rawUi.nodes_exec_approvals_text_e5ae2b3791cb")}</div>
        <div class="card-sub">${t("rawUi.nodes_exec_approvals_text_819a7a849fb4")}</div>
      </div>
      <button
        class="btn btn--sm"
        ?disabled=${state.disabled}
        @click=${() => {
          const next = [...entries, { pattern: "" }];
          state.onPatch(allowlistPath, next);
        }}
      >
        ${t("rawUi.nodes_exec_approvals_text_94b23bc6d93d")}
      </button>
    </div>
    <div class="list" style="margin-top: 12px;">
      ${entries.length === 0
        ? html` <div class="muted">${t("rawUi.nodes_exec_approvals_text_9f30abe871a3")}</div> `
        : entries.map((entry, index) => renderAllowlistEntry(state, entry, index))}
    </div>
  `;
}

function renderAllowlistEntry(
  state: ExecApprovalsState,
  entry: ExecApprovalsAllowlistEntry,
  index: number,
) {
  const lastUsed = entry.lastUsedAt ? formatRelativeTimestamp(entry.lastUsedAt) : "never";
  const lastCommand = entry.lastUsedCommand ? clampText(entry.lastUsedCommand, 120) : null;
  const lastPath = entry.lastResolvedPath ? clampText(entry.lastResolvedPath, 120) : null;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${entry.pattern?.trim()
            ? entry.pattern
            : t("rawUi.nodes_exec_approvals_dynamic_2a8d7e68fad3")}
        </div>
        <div class="list-sub">
          ${t("rawUi.nodes_exec_approvals_fragment_d48bc300f319")} ${lastUsed}
        </div>
        ${lastCommand ? html`<div class="list-sub mono">${lastCommand}</div>` : nothing}
        ${lastPath ? html`<div class="list-sub mono">${lastPath}</div>` : nothing}
      </div>
      <div class="list-meta">
        <label class="field">
          <span>${t("rawUi.nodes_exec_approvals_text_793b74c6f338")}</span>
          <input
            type="text"
            .value=${entry.pattern ?? ""}
            ?disabled=${state.disabled}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              state.onPatch(
                ["agents", state.selectedScope, "allowlist", index, "pattern"],
                target.value,
              );
            }}
          />
        </label>
        <button
          class="btn btn--sm danger"
          ?disabled=${state.disabled}
          @click=${() => {
            if (state.allowlist.length <= 1) {
              state.onRemove(["agents", state.selectedScope, "allowlist"]);
              return;
            }
            state.onRemove(["agents", state.selectedScope, "allowlist", index]);
          }}
        >
          ${t("rawUi.nodes_exec_approvals_text_32639c1fa136")}
        </button>
      </div>
    </div>
  `;
}

function resolveExecApprovalsNodes(
  nodes: Array<Record<string, unknown>>,
): ExecApprovalsTargetNode[] {
  return resolveNodeTargets(nodes, ["system.execApprovals.get", "system.execApprovals.set"]);
}
