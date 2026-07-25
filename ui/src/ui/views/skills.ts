// Control UI view renders skills screen content.
import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { t } from "../../i18n/index.ts";
import type {
  ClawHubSkillSecurityVerdict,
  ClawHubSearchResult,
  ClawHubSkillDetail,
  SkillMessageMap,
} from "../controllers/skills.ts";
import { clawhubVerdictKey } from "../controllers/skills.ts";
import { clampText } from "../format.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
import { resolveSafeExternalUrl } from "../open-external-url.ts";
import { normalizeLowercaseStringOrEmpty } from "../string-coerce.ts";
import type { AgentsListResult, SkillStatusEntry, SkillStatusReport } from "../types.ts";
import { groupSkills } from "./skills-grouping.ts";
import {
  computeSkillMissing,
  computeSkillReasons,
  isSkillAvailable,
  renderSkillStatusChips,
} from "./skills-shared.ts";

function safeExternalHref(raw?: string): string | null {
  if (!raw) {
    return null;
  }
  return resolveSafeExternalUrl(raw, window.location.href);
}

function showDialogWhenClosed(el?: Element) {
  if (!(el instanceof HTMLDialogElement) || el.open) {
    return;
  }
  if (el.isConnected) {
    el.showModal();
  } else {
    queueMicrotask(() => {
      if (el.isConnected && !el.open) {
        el.showModal();
      }
    });
  }
}

export type SkillsStatusFilter = "all" | "ready" | "needs-setup" | "disabled";
export type SkillDetailTab = "overview" | "card";

export type SkillsProps = {
  connected: boolean;
  loading: boolean;
  report: SkillStatusReport | null;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  error: string | null;
  filter: string;
  statusFilter: SkillsStatusFilter;
  edits: Record<string, string>;
  busyKey: string | null;
  messages: SkillMessageMap;
  detailKey: string | null;
  detailTab: SkillDetailTab;
  clawhubVerdicts: Record<string, ClawHubSkillSecurityVerdict>;
  clawhubVerdictsLoading: boolean;
  clawhubVerdictsError: string | null;
  skillCardContents: Record<string, string>;
  skillCardLoadingKey: string | null;
  skillCardErrors: Record<string, string>;
  clawhubQuery: string;
  clawhubResults: ClawHubSearchResult[] | null;
  clawhubSearchLoading: boolean;
  clawhubSearchError: string | null;
  clawhubDetail: ClawHubSkillDetail | null;
  clawhubDetailSlug: string | null;
  clawhubDetailLoading: boolean;
  clawhubDetailError: string | null;
  clawhubInstallSlug: string | null;
  clawhubInstallMessage: { kind: "success" | "error"; text: string } | null;
  onFilterChange: (next: string) => void;
  onAgentChange: (agentId: string) => void;
  onStatusFilterChange: (next: SkillsStatusFilter) => void;
  onRefresh: () => void;
  onToggle: (skillKey: string, enabled: boolean) => void;
  onEdit: (skillKey: string, value: string) => void;
  onSaveKey: (skillKey: string) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
  onDetailOpen: (skillKey: string) => void;
  onDetailClose: () => void;
  onDetailTabChange: (tab: SkillDetailTab) => void;
  onClawHubQueryChange: (query: string) => void;
  onClawHubDetailOpen: (slug: string) => void;
  onClawHubDetailClose: () => void;
  onClawHubInstall: (slug: string) => void;
};

type StatusTabDef = { id: SkillsStatusFilter; label: string };

const STATUS_TABS: StatusTabDef[] = [
  {
    id: "all",
    get label() {
      return t("rawUi.skills_prop_ef9599f7892f");
    },
  },
  {
    id: "ready",
    get label() {
      return t("rawUi.skills_prop_b9b9febb46d9");
    },
  },
  {
    id: "needs-setup",
    get label() {
      return t("rawUi.skills_prop_0060f16d28ee");
    },
  },
  {
    id: "disabled",
    get label() {
      return t("rawUi.skills_prop_f5e8075e2bf4");
    },
  },
];

function skillMatchesStatus(skill: SkillStatusEntry, status: SkillsStatusFilter): boolean {
  switch (status) {
    case "all":
      return true;
    case "ready":
      return !skill.disabled && isSkillAvailable(skill);
    case "needs-setup":
      return !skill.disabled && !isSkillAvailable(skill);
    case "disabled":
      return skill.disabled;
  }
  throw new Error("Unsupported skills status filter");
}

function skillStatusClass(skill: SkillStatusEntry): string {
  if (skill.disabled) {
    return "muted";
  }
  return isSkillAvailable(skill) ? "ok" : "warn";
}

function verdictForSkill(skill: SkillStatusEntry, verdicts: SkillsProps["clawhubVerdicts"]) {
  const link = skill.clawhub;
  if (!link || link.status !== "linked" || !link.valid) {
    return null;
  }
  return (
    verdicts[
      clawhubVerdictKey({
        registry: link.registry,
        slug: link.slug,
        version: link.installedVersion,
      })
    ] ?? null
  );
}

function verdictLabel(verdict: ClawHubSkillSecurityVerdict | null | undefined): string {
  if (!verdict) {
    return t("rawUi.skills_verdict_unavailable");
  }
  const status = verdict.securityStatus?.trim() || null;
  if (verdict.ok && verdict.decision === "pass") {
    return status === "clean" || !status ? t("rawUi.skills_verdict_clean") : status;
  }
  if (status === "pending" || status === "not-run") {
    return t("rawUi.skills_verdict_pending");
  }
  if (status === "malicious") {
    return t("rawUi.skills_verdict_blocked");
  }
  if (status === "suspicious") {
    return t("rawUi.skills_verdict_review");
  }
  return t("rawUi.skills_verdict_unavailable");
}

function verdictChipClass(verdict: ClawHubSkillSecurityVerdict | null | undefined): string {
  if (!verdict) {
    return "chip-warn";
  }
  if (verdict.ok && verdict.decision === "pass") {
    return "chip-ok";
  }
  const status = verdict.securityStatus?.trim() || null;
  return status === "pending" || status === "not-run" ? "chip" : "chip-warn";
}

type SkillsAgentOption = AgentsListResult["agents"][number];

function agentOptionLabel(agent: SkillsAgentOption, defaultId: string | undefined): string {
  const baseName = agent.identity?.name?.trim() || agent.name?.trim() || agent.id;
  return agent.id === defaultId ? `${baseName} (default)` : baseName;
}

export function renderSkills(props: SkillsProps) {
  const skills = props.report?.skills ?? [];
  const agents = props.agentsList?.agents ?? [];
  const selectedAgentId =
    props.selectedAgentId ?? props.agentsList?.defaultId ?? agents[0]?.id ?? "";

  const statusCounts: Record<SkillsStatusFilter, number> = {
    all: skills.length,
    ready: 0,
    "needs-setup": 0,
    disabled: 0,
  };
  for (const s of skills) {
    if (s.disabled) {
      statusCounts.disabled++;
    } else if (isSkillAvailable(s)) {
      statusCounts.ready++;
    } else {
      statusCounts["needs-setup"]++;
    }
  }

  const afterStatus =
    props.statusFilter === "all"
      ? skills
      : skills.filter((s) => skillMatchesStatus(s, props.statusFilter));

  const filter = normalizeLowercaseStringOrEmpty(props.filter);
  const filtered = filter
    ? afterStatus.filter((skill) =>
        normalizeLowercaseStringOrEmpty(
          [skill.name, skill.description, skill.source].join(" "),
        ).includes(filter),
      )
    : afterStatus;
  const groups = groupSkills(filtered);

  const detailSkill = props.detailKey
    ? (skills.find((s) => s.skillKey === props.detailKey) ?? null)
    : null;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("rawUi.skills_text_7eb70ddf6c52")}</div>
          <div class="card-sub">${t("rawUi.skills_text_3b12410f0b2e")}</div>
        </div>
        <button
          class="btn"
          ?disabled=${props.loading || !props.connected}
          @click=${props.onRefresh}
        >
          ${props.loading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      <div class="agent-tabs" style="margin-top: 14px;">
        ${STATUS_TABS.map(
          (tab) => html`
            <button
              class="agent-tab ${props.statusFilter === tab.id ? "active" : ""}"
              @click=${() => props.onStatusFilterChange(tab.id)}
            >
              ${tab.label}<span class="agent-tab-count">${statusCounts[tab.id]}</span>
            </button>
          `,
        )}
      </div>

      <div
        class="filters"
        style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px;"
      >
        ${agents.length > 0
          ? html`
              <label class="field" style="min-width: 180px;">
                <span>${t("common.filters.agent")}</span>
                <select
                  name="skills-agent"
                  .value=${selectedAgentId}
                  ?disabled=${props.loading || !props.connected || agents.length < 2}
                  @change=${(e: Event) =>
                    props.onAgentChange((e.target as HTMLSelectElement).value)}
                >
                  ${agents.map(
                    (agent) => html`
                      <option value=${agent.id} ?selected=${agent.id === selectedAgentId}>
                        ${agentOptionLabel(agent, props.agentsList?.defaultId)}
                      </option>
                    `,
                  )}
                </select>
              </label>
            `
          : nothing}
        <label class="field" style="flex: 1; min-width: 180px;">
          <input
            .value=${props.filter}
            @input=${(e: Event) => props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder=${t("rawUi.skills_attr_fc63ba7b0755")}
            autocomplete="off"
            name="skills-filter"
          />
        </label>
        <div class="muted">${filtered.length} ${t("rawUi.skills_fragment_a0790915c805")}</div>
      </div>

      <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="font-weight: 600;">${t("rawUi.skills_text_78d2127c80e2")}</div>
          <div class="muted" style="font-size: 13px;">${t("rawUi.skills_text_1e8891db5d39")}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <label class="field" style="flex: 1; min-width: 180px;">
            <input
              .value=${props.clawhubQuery}
              @input=${(e: Event) =>
                props.onClawHubQueryChange((e.target as HTMLInputElement).value)}
              placeholder=${t("rawUi.skills_attr_93dd3cc30fd4")}
              autocomplete="off"
              name="clawhub-search"
            />
          </label>
          ${props.clawhubSearchLoading
            ? html`<span class="muted">${t("rawUi.skills_text_1fd4e26e668a")}</span>`
            : nothing}
        </div>
        ${props.clawhubSearchError
          ? html`<div class="callout danger" style="margin-top: 8px;">
              ${props.clawhubSearchError}
            </div>`
          : nothing}
        ${props.clawhubInstallMessage
          ? html`<div
              class="callout ${props.clawhubInstallMessage.kind === "error" ? "danger" : "success"}"
              style="margin-top: 8px;"
            >
              ${props.clawhubInstallMessage.text}
            </div>`
          : nothing}
        ${renderClawHubResults(props)}
      </div>

      ${props.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
        : nothing}
      ${filtered.length === 0
        ? html`
            <div class="muted" style="margin-top: 16px">
              ${!props.connected && !props.report
                ? t("rawUi.skills_dynamic_3bda6665bb97")
                : t("rawUi.skills_dynamic_21854e61ade1")}
            </div>
          `
        : html`
            <div class="agent-skills-groups" style="margin-top: 16px;">
              ${groups.map((group) => {
                return html`
                  <details class="agent-skills-group" open>
                    <summary class="agent-skills-header">
                      <span>${group.label}</span>
                      <span class="muted">${group.skills.length}</span>
                    </summary>
                    <div class="list skills-grid">
                      ${repeat(
                        group.skills,
                        (skill) => skill.skillKey,
                        (skill) => renderSkill(skill, props),
                      )}
                    </div>
                  </details>
                `;
              })}
            </div>
          `}
    </section>

    ${detailSkill ? renderSkillDetail(detailSkill, props) : nothing}
    ${props.clawhubDetailSlug ? renderClawHubDetailDialog(props) : nothing}
  `;
}

function renderClawHubResults(props: SkillsProps) {
  const results = props.clawhubResults;
  if (!results) {
    return nothing;
  }
  if (results.length === 0) {
    return html`<div class="muted" style="margin-top: 8px;">
      ${t("rawUi.skills_text_12dba2a945ec")}
    </div>`;
  }
  return html`
    <div class="list" style="margin-top: 8px;">
      ${results.map(
        (r) => html`
          <div
            class="list-item list-item-clickable"
            @click=${() => props.onClawHubDetailOpen(r.slug)}
          >
            <div class="list-main">
              <div class="list-title">${r.displayName}</div>
              <div class="list-sub">${r.summary ? clampText(r.summary, 120) : r.slug}</div>
            </div>
            <div class="list-meta" style="display: flex; align-items: center; gap: 8px;">
              ${r.version
                ? html`<span class="muted" style="font-size: 12px;">v${r.version}</span>`
                : nothing}
              <button
                class="btn btn--sm"
                ?disabled=${props.clawhubInstallSlug !== null}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  props.onClawHubInstall(r.slug);
                }}
              >
                ${props.clawhubInstallSlug === r.slug
                  ? t("rawUi.skills_dynamic_5575aa9e6116")
                  : t("rawUi.skills_dynamic_61eb29972a42")}
              </button>
            </div>
          </div>
        `,
      )}
    </div>
  `;
}

function renderClawHubDetailDialog(props: SkillsProps) {
  const detail = props.clawhubDetail;

  return html`
    <dialog
      class="md-preview-dialog"
      ${ref(showDialogWhenClosed)}
      @click=${(e: Event) => {
        const dialog = e.currentTarget as HTMLDialogElement;
        if (e.target === dialog) {
          dialog.close();
        }
      }}
      @close=${props.onClawHubDetailClose}
    >
      <div class="md-preview-dialog__panel">
        <div class="md-preview-dialog__header">
          <div class="md-preview-dialog__title">
            ${detail?.skill?.displayName ?? props.clawhubDetailSlug}
          </div>
          <button
            class="btn btn--sm"
            @click=${(e: Event) => {
              (e.currentTarget as HTMLElement).closest("dialog")?.close();
            }}
          >
            ${t("rawUi.skills_text_7dc81b836b6d")}
          </button>
        </div>
        <div class="md-preview-dialog__body" style="display: grid; gap: 16px;">
          ${props.clawhubDetailLoading
            ? html`<div class="muted">${t("common.loading")}</div>`
            : props.clawhubDetailError
              ? html`<div class="callout danger">${props.clawhubDetailError}</div>`
              : detail?.skill
                ? html`
                    <div style="font-size: 14px; line-height: 1.5;">
                      ${detail.skill.summary ?? ""}
                    </div>
                    ${detail.owner?.displayName
                      ? html`<div class="muted" style="font-size: 13px;">
                          ${t("rawUi.skills_fragment_058d0bb3b11e")}
                          ${detail.owner.displayName}${detail.owner.handle
                            ? html` (@${detail.owner.handle})`
                            : nothing}
                        </div>`
                      : nothing}
                    ${detail.latestVersion
                      ? html`<div class="muted" style="font-size: 13px;">
                          ${t("rawUi.skills_fragment_0fdf651f6012")}${detail.latestVersion.version}
                        </div>`
                      : nothing}
                    ${detail.latestVersion?.changelog
                      ? html`<div
                          style="font-size: 13px; border-top: 1px solid var(--border); padding-top: 12px; white-space: pre-wrap;"
                        >
                          ${detail.latestVersion.changelog}
                        </div>`
                      : nothing}
                    ${detail.metadata?.os
                      ? html`<div class="muted" style="font-size: 12px;">
                          ${t("rawUi.skills_fragment_b9d39e485c5e")}
                          ${detail.metadata.os.join(", ")}
                        </div>`
                      : nothing}
                    <button
                      class="btn primary"
                      ?disabled=${props.clawhubInstallSlug !== null}
                      @click=${() => {
                        if (props.clawhubDetailSlug) {
                          props.onClawHubInstall(props.clawhubDetailSlug);
                        }
                      }}
                    >
                      ${props.clawhubInstallSlug === props.clawhubDetailSlug
                        ? t("rawUi.skills_dynamic_5575aa9e6116")
                        : t("rawUi.skills_dynamic_installSkill", {
                            skill: detail.skill.displayName,
                          })}
                    </button>
                  `
                : html`<div class="muted">${t("rawUi.skills_text_fe57081ac9bf")}</div>`}
        </div>
      </div>
    </dialog>
  `;
}

function renderSkill(skill: SkillStatusEntry, props: SkillsProps) {
  const busy = props.busyKey === skill.skillKey;
  const dotClass = skillStatusClass(skill);
  const verdict = verdictForSkill(skill, props.clawhubVerdicts);

  return html`
    <div class="list-item list-item-clickable" @click=${() => props.onDetailOpen(skill.skillKey)}>
      <div class="list-main">
        <div class="list-title" style="display: flex; align-items: center; gap: 8px;">
          <span class="statusDot ${dotClass}"></span>
          ${skill.emoji ? html`<span>${skill.emoji}</span>` : nothing}
          <span>${skill.name}</span>
        </div>
        <div class="list-sub">${clampText(skill.description, 140)}</div>
      </div>
      <div
        class="list-meta"
        style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;"
      >
        ${skill.clawhub?.status === "linked"
          ? html`<span class="chip ${verdictChipClass(verdict)}">${verdictLabel(verdict)}</span>`
          : skill.clawhub?.status === "invalid"
            ? html`<span class="chip chip-warn">${t("rawUi.skills_text_8935471dffb0")}</span>`
            : nothing}
        <label class="skill-toggle-wrap" @click=${(e: Event) => e.stopPropagation()}>
          <input
            type="checkbox"
            class="skill-toggle"
            .checked=${!skill.disabled}
            ?disabled=${busy}
            @change=${(e: Event) => {
              e.stopPropagation();
              props.onToggle(skill.skillKey, skill.disabled);
            }}
          />
        </label>
      </div>
    </div>
  `;
}

function renderSkillDetail(skill: SkillStatusEntry, props: SkillsProps) {
  const busy = props.busyKey === skill.skillKey;
  const apiKey = props.edits[skill.skillKey] ?? "";
  const message = props.messages[skill.skillKey] ?? null;
  const canInstall = skill.install.length > 0 && skill.missing.bins.length > 0;
  const showBundledBadge = Boolean(skill.bundled && skill.source !== "openclaw-bundled");
  const missing = computeSkillMissing(skill);
  const reasons = computeSkillReasons(skill);
  const verdict = verdictForSkill(skill, props.clawhubVerdicts);
  const detailTab: SkillDetailTab =
    props.detailTab === "card" && skill.skillCard?.present ? "card" : "overview";

  return html`
    <dialog
      class="md-preview-dialog"
      ${ref(showDialogWhenClosed)}
      @click=${(e: Event) => {
        const dialog = e.currentTarget as HTMLDialogElement;
        if (e.target === dialog) {
          dialog.close();
        }
      }}
      @close=${props.onDetailClose}
    >
      <div class="md-preview-dialog__panel">
        <div class="md-preview-dialog__header">
          <div
            class="md-preview-dialog__title"
            style="display: flex; align-items: center; gap: 8px;"
          >
            <span class="statusDot ${skillStatusClass(skill)}"></span>
            ${skill.emoji ? html`<span style="font-size: 18px;">${skill.emoji}</span>` : nothing}
            <span>${skill.name}</span>
          </div>
          <button
            class="btn btn--sm"
            @click=${(e: Event) => {
              (e.currentTarget as HTMLElement).closest("dialog")?.close();
            }}
          >
            ${t("rawUi.skills_text_7dc81b836b6d")}
          </button>
        </div>
        <div class="md-preview-dialog__body" style="display: grid; gap: 16px;">
          <div>
            <div style="font-size: 14px; line-height: 1.5; color: var(--text);">
              ${skill.description}
            </div>
            ${renderSkillStatusChips({ skill, showBundledBadge })}
          </div>

          ${skill.clawhub || skill.skillCard?.present
            ? html`
                <div class="agent-tabs">
                  <button
                    class="agent-tab ${detailTab === "overview" ? "active" : ""}"
                    @click=${() => props.onDetailTabChange("overview")}
                  >
                    ${t("rawUi.skills_text_b750e3b382b7")}
                  </button>
                  ${skill.skillCard?.present
                    ? html`<button
                        class="agent-tab ${detailTab === "card" ? "active" : ""}"
                        @click=${() => props.onDetailTabChange("card")}
                      >
                        ${t("rawUi.skills_text_bb52cffcf561")}
                      </button>`
                    : nothing}
                </div>
              `
            : nothing}
          ${detailTab === "overview"
            ? renderInstalledClawHubOverview(skill, props, verdict)
            : renderInstalledSkillCard(skill, props)}
          ${missing.length > 0
            ? html`
                <div
                  class="callout"
                  style="border-color: var(--warn-subtle); background: var(--warn-subtle); color: var(--warn);"
                >
                  <div style="font-weight: 600; margin-bottom: 4px;">
                    ${t("rawUi.skills_text_0183a9fa9a75")}
                  </div>
                  <div>${missing.join(", ")}</div>
                </div>
              `
            : nothing}
          ${reasons.length > 0
            ? html`
                <div class="muted" style="font-size: 13px;">
                  ${t("rawUi.skills_fragment_ff4835de0746")} ${reasons.join(", ")}
                </div>
              `
            : nothing}

          <div style="display: flex; align-items: center; gap: 12px;">
            <label class="skill-toggle-wrap">
              <input
                type="checkbox"
                class="skill-toggle"
                .checked=${!skill.disabled}
                ?disabled=${busy}
                @change=${() => props.onToggle(skill.skillKey, skill.disabled)}
              />
            </label>
            <span style="font-size: 13px; font-weight: 500;">
              ${skill.disabled
                ? t("rawUi.skills_dynamic_5bfb68be11b9")
                : t("rawUi.skills_dynamic_d409df3611f7")}
            </span>
            ${canInstall
              ? html`<button
                  class="btn"
                  ?disabled=${busy}
                  @click=${() => props.onInstall(skill.skillKey, skill.name, skill.install[0].id)}
                >
                  ${busy ? t("rawUi.skills_dynamic_5575aa9e6116") : skill.install[0].label}
                </button>`
              : nothing}
          </div>

          ${message
            ? html`<div class="callout ${message.kind === "error" ? "danger" : "success"}">
                ${message.message}
              </div>`
            : nothing}
          ${skill.primaryEnv
            ? html`
                <div style="display: grid; gap: 8px;">
                  <div class="field">
                    <span
                      >${t("rawUi.skills_text_f859481a374b")}
                      <span class="muted" style="font-weight: normal; font-size: 0.88em;"
                        >(${skill.primaryEnv})</span
                      ></span
                    >
                    <input
                      type="password"
                      .value=${apiKey}
                      @input=${(e: Event) =>
                        props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)}
                    />
                  </div>
                  ${(() => {
                    const href = safeExternalHref(skill.homepage);
                    return href
                      ? html`<div class="muted" style="font-size: 13px;">
                          ${t("rawUi.skills_text_90bee241b0c0")}
                          <a href="${href}" target="_blank" rel="noopener noreferrer"
                            >${skill.homepage}</a
                          >
                        </div>`
                      : nothing;
                  })()}
                  <button
                    class="btn primary"
                    ?disabled=${busy}
                    @click=${() => props.onSaveKey(skill.skillKey)}
                  >
                    ${t("rawUi.skills_text_784755da93ab")}
                  </button>
                </div>
              `
            : nothing}

          <div
            style="border-top: 1px solid var(--border); padding-top: 12px; display: grid; gap: 6px; font-size: 12px; color: var(--muted);"
          >
            <div>
              <span style="font-weight: 600;">${t("rawUi.skills_text_840558633677")}</span>
              ${skill.source}
            </div>
            <div style="font-family: var(--mono); word-break: break-all;">${skill.filePath}</div>
            ${(() => {
              const safeHref = safeExternalHref(skill.homepage);
              return safeHref
                ? html`<div>
                    <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
                      >${skill.homepage}</a
                    >
                  </div>`
                : nothing;
            })()}
          </div>
        </div>
      </div>
    </dialog>
  `;
}

function renderInstalledClawHubOverview(
  skill: SkillStatusEntry,
  props: SkillsProps,
  verdict: ClawHubSkillSecurityVerdict | null,
) {
  const link = skill.clawhub;
  if (!link) {
    return nothing;
  }
  if (link.status === "invalid") {
    return html`<div class="callout danger">
      <div style="font-weight: 600; margin-bottom: 4px;">
        ${t("rawUi.skills_text_8935471dffb0")}
      </div>
      <div>${link.reason}</div>
    </div>`;
  }
  const auditHref = safeExternalHref(verdict?.securityAuditUrl ?? undefined);
  const reasonText = verdict?.reasons?.length ? verdict.reasons.join(", ") : null;
  return html`
    <div
      class="callout"
      style="display: grid; gap: 8px; border-color: var(--border); background: var(--panel-2);"
    >
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span class="chip ${verdictChipClass(verdict)}">${verdictLabel(verdict)}</span>
        <span class="muted" style="font-size: 12px;">${link.slug}@${link.installedVersion}</span>
        ${props.clawhubVerdictsLoading
          ? html`<span class="muted">${t("rawUi.skills_text_eab5564152fb")}</span>`
          : nothing}
      </div>
      ${props.clawhubVerdictsError
        ? html`<div class="muted" style="font-size: 13px;">${props.clawhubVerdictsError}</div>`
        : reasonText
          ? html`<div class="muted" style="font-size: 13px;">${reasonText}</div>`
          : nothing}
      ${auditHref
        ? html`<div style="font-size: 13px;">
            <a href="${auditHref}" target="_blank" rel="noopener noreferrer"
              >${t("rawUi.skills_text_3d49773bc2ad")}</a
            >
          </div>`
        : nothing}
    </div>
  `;
}

function renderInstalledSkillCard(skill: SkillStatusEntry, props: SkillsProps) {
  const card = skill.skillCard;
  if (!card?.present) {
    return nothing;
  }
  const content = props.skillCardContents[skill.skillKey];
  if (content === undefined) {
    const error = props.skillCardErrors[skill.skillKey];
    if (error) {
      return html`<div class="callout danger">${error}</div>`;
    }
    return html`<div class="muted" style="font-size: 13px;">
      ${props.skillCardLoadingKey === skill.skillKey
        ? t("rawUi.skills_dynamic_a8ba2d50628f")
        : t("rawUi.skills_dynamic_3dadb7e2ccad")}
    </div>`;
  }
  return html`
    <article class="sidebar-markdown" style="max-width: 100%; overflow-wrap: anywhere;">
      ${unsafeHTML(toSanitizedMarkdownHtml(content))}
    </article>
  `;
}
